import Ajv, {Options} from 'ajv';
import {Schema as JSONSchema} from 'electron-store';
import {Except} from 'type-fest';

export type Schema<T extends {'required': boolean} = any> = Except<JSONSchema<T>, 'required'> & {
  required?: boolean;
  customType?: string;
};

const hexColorValidator = () => {
  return {
    type: 'string',
    pattern: /^((0x)|#)([\dA-Fa-f]{8}|[\dA-Fa-f]{6})$/.source
  };
};

const keyboardShortcutValidator = () => {
  return {
    type: 'string'
  };
};

const validators = new Map<string, (parentSchema: object) => object>([
  ['hexColor', hexColorValidator],
  ['keyboardShortcut', keyboardShortcutValidator]
]);

export default class CustomAjv extends Ajv {
  constructor(options: Options) {
    super(options);

    this.addKeyword({
      keyword: 'customType',
      macro: (schema: string, parentSchema: object) => {
        const validator = validators.get(schema);

        if (!validator) {
          throw new Error(`No custom type found for ${schema}`);
        }

        return validator(parentSchema);
      },
      metaSchema: {
        type: 'string',
        enum: [...validators.keys()]
      }
    });
  }
}
