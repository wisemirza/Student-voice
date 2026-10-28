const db = require('./db');

function getActiveProvider() {
  const raw = (process.env.TRANSLATION_PROVIDER || 'auto').toLowerCase().trim();
  return raw || 'auto';
}

function isTranslationConfigured() {
  const provider = getActiveProvider();
  if (provider === 'none') return false;
  if (provider === 'auto' || provider === 'mymemory') return true;
  if (provider === 'libretranslate') {
    return Boolean(process.env.TRANSLATION_API_URL && process.env.TRANSLATION_API_URL.trim());
  }
  return Boolean(process.env.TRANSLATION_API_KEY && process.env.TRANSLATION_API_KEY.trim());
}

/**
 * Detect whether a string is predominantly Chinese characters or English/Latin.
 */
function detectSourceLanguage(text) {
  if (!text) return 'en';
  const cjkMatches = text.match(/[\u4e00-\u9fff]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  return cjkCount >= 2 ? 'zh-CN' : 'en';
}

async function translateSingleMyMemory(text, sourceLang, targetLang) {
  if (!text || !text.trim()) return '';
  const sl = sourceLang === 'zh-CN' ? 'zh-CN' : 'en';
  const tl = targetLang === 'zh-CN' ? 'zh-CN' : 'en';
  if (sl === tl) return text;

  // MyMemory supports up to 500 bytes per query; split cleanly by paragraph/sentence if longer
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= 420) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n', 420);
    if (splitIdx < 100) splitIdx = remaining.lastIndexOf('. ', 420);
    if (splitIdx < 100) splitIdx = remaining.lastIndexOf('。', 420);
    if (splitIdx < 100) splitIdx = 420;
    chunks.push(remaining.slice(0, splitIdx + 1).trim());
    remaining = remaining.slice(splitIdx + 1).trim();
  }

  const translatedChunks = [];
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      chunk
    )}&langpair=${encodeURIComponent(`${sl}|${tl}`)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      throw new Error(`MyMemory HTTP ${res.status}`);
    }
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (!out) {
      throw new Error('Empty translation response');
    }
    translatedChunks.push(out);
  }

  return translatedChunks.join(' ');
}

async function translateViaMyMemory(title, description, sourceLang, targetLang) {
  const [translatedTitle, translatedDescription] = await Promise.all([
    title ? translateSingleMyMemory(title, sourceLang, targetLang) : Promise.resolve(''),
    translateSingleMyMemory(description, sourceLang, targetLang)
  ]);

  return {
    translatedTitle,
    translatedDescription,
    provider: 'Auto Translation'
  };
}

async function translateViaGoogle(title, description, targetLang) {
  const apiKey = process.env.TRANSLATION_API_KEY.trim();
  const googleTarget = targetLang === 'zh-CN' ? 'zh-CN' : 'en';
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;

  const inputs = title ? [title, description] : [description];
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: inputs,
      target: googleTarget,
      format: 'text'
    })
  });

  if (!response.ok) {
    throw new Error(`Google Translate API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const translations = data?.data?.translations || [];
  return {
    translatedTitle: title ? translations[0]?.translatedText || '' : '',
    translatedDescription: title
      ? translations[1]?.translatedText || description
      : translations[0]?.translatedText || description,
    provider: 'Google Cloud Translation'
  };
}

async function translateViaDeepL(title, description, targetLang) {
  const apiKey = process.env.TRANSLATION_API_KEY.trim();
  const baseUrl = (
    process.env.TRANSLATION_API_URL || 'https://api-free.deepl.com/v2/translate'
  ).trim();
  const deeplTarget = targetLang === 'zh-CN' ? 'ZH-HANS' : 'EN-GB';
  const inputs = title ? [title, description] : [description];

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: inputs,
      target_lang: deeplTarget
    })
  });

  if (!response.ok) {
    throw new Error(`DeepL API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const list = data?.translations || [];
  return {
    translatedTitle: title ? list[0]?.text || '' : '',
    translatedDescription: title ? list[1]?.text || description : list[0]?.text || description,
    provider: 'DeepL'
  };
}

async function translateViaOpenAI(title, description, targetLang) {
  const apiKey = process.env.TRANSLATION_API_KEY.trim();
  const baseUrl = (
    process.env.TRANSLATION_API_URL || 'https://api.openai.com/v1/chat/completions'
  ).trim();
  const model = (process.env.TRANSLATION_MODEL || 'gpt-4o-mini').trim();
  const targetName = targetLang === 'zh-CN' ? 'Simplified Chinese (简体中文)' : 'British English';

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Translate the JSON fields "title" and "description" faithfully into ${targetName}. If "title" is empty, return "" for "translatedTitle". Return strictly JSON with keys "translatedTitle" and "translatedDescription".`
        },
        {
          role: 'user',
          content: JSON.stringify({ title: title || '', description })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI Translation API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
  return {
    translatedTitle: String(parsed.translatedTitle || '').trim(),
    translatedDescription: String(parsed.translatedDescription || description).trim(),
    provider: 'AI Translation'
  };
}

/**
 * Translate a single issue into targetLang ('en' or 'zh-CN') and cache in DB.
 */
async function translateIssue(issue, targetLang) {
  if (!['en', 'zh-CN'].includes(targetLang)) {
    return {
      issueId: issue.id,
      targetLang,
      originalTitle: issue.title || '',
      originalDescription: issue.description,
      translatedTitle: issue.title || '',
      translatedDescription: issue.description,
      cached: false
    };
  }

  const sourceLang = detectSourceLanguage(`${issue.title || ''} ${issue.description}`);
  if (sourceLang === targetLang) {
    return {
      issueId: issue.id,
      targetLang,
      originalTitle: issue.title || '',
      originalDescription: issue.description,
      translatedTitle: issue.title || '',
      translatedDescription: issue.description,
      cached: true
    };
  }

  const cached = await db.getCachedTranslation(issue.id, targetLang);
  if (cached) {
    return {
      issueId: issue.id,
      targetLang,
      originalTitle: issue.title || '',
      originalDescription: issue.description,
      translatedTitle: cached.translated_title || '',
      translatedDescription: cached.translated_description,
      provider: cached.provider,
      cached: true
    };
  }

  if (!isTranslationConfigured()) {
    const err = new Error('Machine translation is disabled.');
    err.code = 'TRANSLATION_NOT_CONFIGURED';
    throw err;
  }

  const provider = getActiveProvider();
  let result;

  if (provider === 'google' && process.env.TRANSLATION_API_KEY) {
    result = await translateViaGoogle(issue.title || '', issue.description, targetLang);
  } else if (provider === 'deepl' && process.env.TRANSLATION_API_KEY) {
    result = await translateViaDeepL(issue.title || '', issue.description, targetLang);
  } else if (provider === 'openai' && process.env.TRANSLATION_API_KEY) {
    result = await translateViaOpenAI(issue.title || '', issue.description, targetLang);
  } else {
    result = await translateViaMyMemory(
      issue.title || '',
      issue.description,
      sourceLang,
      targetLang
    );
  }

  await db.saveCachedTranslation({
    issueId: issue.id,
    targetLang,
    translatedTitle: result.translatedTitle,
    translatedDescription: result.translatedDescription,
    provider: result.provider
  });

  return {
    issueId: issue.id,
    targetLang,
    originalTitle: issue.title || '',
    originalDescription: issue.description,
    translatedTitle: result.translatedTitle,
    translatedDescription: result.translatedDescription,
    provider: result.provider,
    cached: false
  };
}

/**
 * Automatically localize a list of issues into targetLang ('en' | 'zh-CN')
 * while preserving original_title and original_description.
 */
async function localizeIssuesList(issues, targetLang) {
  if (!targetLang || !['en', 'zh-CN'].includes(targetLang) || issues.length === 0) {
    return issues;
  }

  const needsTranslation = [];
  issues.forEach((issue) => {
    const src = detectSourceLanguage(`${issue.title || ''} ${issue.description}`);
    if (src !== targetLang) {
      needsTranslation.push(issue);
    }
  });

  if (needsTranslation.length === 0) {
    return issues;
  }

  const cachedMap = await db.getCachedTranslationsForLang(
    needsTranslation.map((i) => i.id),
    targetLang
  );

  // Translate any uncached issues in parallel if translation is enabled
  const uncached = needsTranslation.filter((i) => !cachedMap.has(i.id));
  if (uncached.length > 0 && isTranslationConfigured()) {
    await Promise.all(
      uncached.map(async (issue) => {
        try {
          const res = await translateIssue(issue, targetLang);
          cachedMap.set(issue.id, {
            translated_title: res.translatedTitle,
            translated_description: res.translatedDescription
          });
        } catch {
          // Gracefully keep original text if network call fails
        }
      })
    );
  }

  return issues.map((issue) => {
    const tr = cachedMap.get(issue.id);
    if (!tr) return issue;
    return {
      ...issue,
      original_title: issue.title || '',
      original_description: issue.description,
      title: tr.translated_title !== undefined ? tr.translated_title : issue.title,
      description: tr.translated_description || issue.description
    };
  });
}

module.exports = {
  isTranslationConfigured,
  detectSourceLanguage,
  translateIssue,
  localizeIssuesList
};
