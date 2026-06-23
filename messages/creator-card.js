const CreatorCardMessages = {
  SLUG_TAKEN: 'Slug is already taken',
  ACCESS_CODE_REQUIRED: 'access_code is required when access_type is private',
  ACCESS_CODE_PUBLIC_FORBIDDEN: 'access_code can only be set on private cards',
  NOT_FOUND: 'Creator card not found',
  DRAFT_NOT_FOUND: 'Creator card not found',
  ACCESS_CODE_REQUIRED_VIEW: 'This card is private. An access code is required',
  INVALID_ACCESS_CODE: 'Invalid access code',
  INVALID_SLUG_FORMAT: 'Slug may only contain letters, numbers, hyphens, and underscores',
  INVALID_ACCESS_CODE_FORMAT: 'access_code must be exactly 6 alphanumeric characters',
  INVALID_LINK_URL: 'Link URL must start with http:// or https://',
  INVALID_RATE_AMOUNT: 'Service rate amount must be a positive integer',
  EMPTY_SERVICE_RATES:
    'service_rates.rates must be a non-empty array when service_rates is present',
};

module.exports = CreatorCardMessages;
