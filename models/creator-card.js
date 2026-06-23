const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator_cards';

const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, required: true, unique: true, index: true },
  creator_reference: { type: SchemaTypes.String, required: true },
  links: { type: [SchemaTypes.Mixed], default: [] },
  service_rates: { type: SchemaTypes.Mixed },
  status: { type: SchemaTypes.String, required: true, enum: ['draft', 'published'] },
  access_type: {
    type: SchemaTypes.String,
    required: true,
    default: 'public',
    enum: ['public', 'private'],
  },
  access_code: { type: SchemaTypes.String, default: null },
  deleted: { type: SchemaTypes.Number, default: null },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

module.exports = DatabaseModel.model(modelName, modelSchema);
