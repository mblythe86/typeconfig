import {ToJSONOptions} from './base/IConfigClassBase';

export interface SubClassOptions extends ToJSONOptions {
  attachDescription?: boolean;
  attachState?: boolean;
  enumsAsString?: boolean;
  /**
   * If a property is set through cli or env variable, it becomes readonly
   */
  disableAutoReadonly?: boolean;
}
