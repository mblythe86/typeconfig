export interface PropertyConstraint<T, C> {
  assert: (value: T, config?: C) => boolean;
  fallBackValue?: T;
  assertReason?: string;
}

export type Enum<E> = Record<keyof E, number | string> & { [k: number]: string };
export declare type ObjectType<T> = {
  new(): T;
} | Function;

export type propertyTypes =
  'positiveFloat'
  | 'unsignedInt'
  | 'ratio'
  | 'integer'
  | typeof Number
  | typeof Boolean
  | typeof String
  | typeof Object
  | typeof Date
  | typeof Array
  | ObjectType<any>
  | Enum<any>;


export interface PropertyOptions<T, C> {
  type?: propertyTypes;
  onNewValue?: (value: T, config?: C) => void;
  arrayType?: propertyTypes;
  volatile?: boolean;
  description?: string;
  envAlias?: string;
  constraint?: PropertyConstraint<T, any>;
}

export interface IPropertyMetadata<T, C> extends PropertyOptions<T, C> {
  type: propertyTypes;
  arrayType?: propertyTypes;
  volatile?: boolean;
  description?: string;
  envAlias?: string;
  constraint?: PropertyConstraint<T, C>

}
