function isLetter(char) {
  const code = char.charCodeAt(0);
  return (code >= 97 && code <= 122) || (code >= 65 && code <= 90);
}

function isDigit(char) {
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function isValidSlugCharacter(char) {
  return isLetter(char) || isDigit(char) || char === '-' || char === '_';
}

function isValidSlugFormat(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  for (let i = 0; i < slug.length; i += 1) {
    if (!isValidSlugCharacter(slug.charAt(i))) {
      return false;
    }
  }

  return true;
}

function isAlphanumeric(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  for (let i = 0; i < value.length; i += 1) {
    const char = value.charAt(i);
    if (!isLetter(char) && !isDigit(char)) {
      return false;
    }
  }

  return true;
}

function isValidLinkUrl(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function replaceWhitespaceWithHyphens(value) {
  let result = value;
  const whitespaceChars = [' ', '\t', '\n', '\r'];

  whitespaceChars.forEach((whitespaceChar) => {
    while (result.includes(whitespaceChar)) {
      result = result.split(whitespaceChar).join('-');
    }
  });

  return result;
}

function slugifyTitle(title) {
  let slug = title.toLowerCase();
  slug = replaceWhitespaceWithHyphens(slug);

  let cleaned = '';
  for (let i = 0; i < slug.length; i += 1) {
    const char = slug.charAt(i);
    if (isValidSlugCharacter(char)) {
      cleaned += char;
    }
  }

  return cleaned;
}

function generateRandomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * chars.length);
    result += chars.charAt(index);
  }

  return result;
}

function serializeCreatorCard(card, options = {}) {
  const { includeAccessCode = true } = options;

  const serialized = {
    id: card._id || card.id,
    title: card.title,
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: card.links || [],
    status: card.status,
    access_type: card.access_type || 'public',
    created: card.created,
    updated: card.updated,
    deleted: card.deleted ?? null,
  };

  if (card.description !== undefined && card.description !== null) {
    serialized.description = card.description;
  }

  if (card.service_rates) {
    serialized.service_rates = card.service_rates;
  }

  if (includeAccessCode) {
    serialized.access_code = serialized.access_type === 'private' ? card.access_code || null : null;
  }

  return serialized;
}

module.exports = {
  isValidSlugFormat,
  isAlphanumeric,
  isValidLinkUrl,
  isPositiveInteger,
  slugifyTitle,
  generateRandomAlphanumeric,
  serializeCreatorCard,
};
