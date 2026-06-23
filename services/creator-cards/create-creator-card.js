const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const CreatorCardMessages = require('@app/messages/creator-card');
const creatorCardRepository = require('@app/repository/creator-card');
const {
  isValidSlugFormat,
  isAlphanumeric,
  isValidLinkUrl,
  isPositiveInteger,
  slugifyTitle,
  generateRandomAlphanumeric,
  serializeCreatorCard,
} = require('./helpers');

const createSpec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const parsedCreateSpec = validator.parse(createSpec);

async function slugExists(slug) {
  const existingCard = await creatorCardRepository.findOne({
    query: { slug },
  });

  return !!existingCard;
}

async function resolveUniqueSlug(baseSlug) {
  const candidate = `${baseSlug}-${generateRandomAlphanumeric(6)}`;
  const taken = await slugExists(candidate);

  if (taken) {
    return resolveUniqueSlug(baseSlug);
  }

  return candidate;
}

async function resolveAutoSlug(title) {
  const baseSlug = slugifyTitle(title);

  if (baseSlug.length >= 5 && !(await slugExists(baseSlug))) {
    return baseSlug;
  }

  return resolveUniqueSlug(baseSlug);
}

function validateAccessRules(data, accessType) {
  if (accessType === 'private') {
    if (!data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
    }

    if (!isAlphanumeric(data.access_code)) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, 'AC01');
    }
  } else if (data.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_PUBLIC_FORBIDDEN, 'AC05');
  }
}

function validateSlugFormat(slug) {
  if (!isValidSlugFormat(slug)) {
    throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, 'SPCL_VALIDATION');
  }
}

function validateLinks(links) {
  if (!links || !links.length) {
    return;
  }

  links.forEach((link) => {
    if (!isValidLinkUrl(link.url)) {
      throwAppError(CreatorCardMessages.INVALID_LINK_URL, 'SPCL_VALIDATION');
    }
  });
}

function validateServiceRates(serviceRates) {
  if (!serviceRates) {
    return;
  }

  if (!serviceRates.rates || !serviceRates.rates.length) {
    throwAppError(CreatorCardMessages.EMPTY_SERVICE_RATES, 'SPCL_VALIDATION');
  }

  serviceRates.rates.forEach((rate) => {
    if (!isPositiveInteger(rate.amount)) {
      throwAppError(CreatorCardMessages.INVALID_RATE_AMOUNT, 'SPCL_VALIDATION');
    }
  });
}

async function createCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedCreateSpec);
  const accessType = data.access_type || 'public';

  validateAccessRules(data, accessType);
  validateLinks(data.links);
  validateServiceRates(data.service_rates);

  let { slug } = data;
  const clientProvidedSlug = typeof data.slug === 'string' && data.slug.length > 0;

  if (clientProvidedSlug) {
    validateSlugFormat(slug);

    if (await slugExists(slug)) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
    }
  } else {
    slug = await resolveAutoSlug(data.title);
  }

  const cardPayload = {
    title: data.title,
    slug,
    creator_reference: data.creator_reference,
    links: data.links || [],
    status: data.status,
    access_type: accessType,
    access_code: accessType === 'private' ? data.access_code : null,
  };

  if (data.description !== undefined) {
    cardPayload.description = data.description;
  }

  if (data.service_rates) {
    cardPayload.service_rates = data.service_rates;
  }

  const createdCard = await creatorCardRepository.create(cardPayload, options);

  return serializeCreatorCard(createdCard, { includeAccessCode: true });
}

module.exports = createCreatorCard;
