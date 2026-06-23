const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const CreatorCardMessages = require('@app/messages/creator-card');
const creatorCardRepository = require('@app/repository/creator-card');
const { serializeCreatorCard } = require('./helpers');

const deleteSpec = `root {
  creator_reference string<trim|length:20>
}`;

const parsedDeleteSpec = validator.parse(deleteSpec);

async function deleteCreatorCard(serviceData, options = {}) {
  validator.validate(serviceData, parsedDeleteSpec);
  const { slug } = serviceData;

  const card = await creatorCardRepository.findOne({
    query: { slug, deleted: null },
  });

  if (!card) {
    throwAppError(CreatorCardMessages.NOT_FOUND, 'NF01');
  }

  const deletedAt = Date.now();

  await creatorCardRepository.updateOne({
    query: { slug, deleted: null },
    updateValues: { deleted: deletedAt },
    options,
  });

  return serializeCreatorCard(
    {
      ...card,
      deleted: deletedAt,
      updated: deletedAt,
    },
    { includeAccessCode: true }
  );
}

module.exports = deleteCreatorCard;
