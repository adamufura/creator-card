const { throwAppError } = require('@app-core/errors');
const CreatorCardMessages = require('@app/messages/creator-card');
const creatorCardRepository = require('@app/repository/creator-card');
const { serializeCreatorCard } = require('./helpers');

async function getCreatorCard(serviceData) {
  const { slug, access_code: accessCode } = serviceData;

  const card = await creatorCardRepository.findOne({
    query: { slug, deleted: null },
  });

  if (!card) {
    throwAppError(CreatorCardMessages.NOT_FOUND, 'NF01');
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.DRAFT_NOT_FOUND, 'NF02');
  }

  if (card.access_type === 'private') {
    if (!accessCode) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED_VIEW, 'AC03');
    }

    if (accessCode !== card.access_code) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
    }
  }

  return serializeCreatorCard(card, { includeAccessCode: false });
}

module.exports = getCreatorCard;
