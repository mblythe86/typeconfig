import {ConfigLoader} from '../../ConfigLoader';
import * as optimist from 'optimist';
import {AbstractRootConfigClass, ConfigClassOptionsBase} from './base/AbstractRootConfigClass';
import {IConfigClassPrivate} from './IConfigClass';
import {promises as fsp} from 'fs';


export interface ConfigCLIOptions {
  attachDescription?: boolean;
  attachDefaults?: boolean;
  configPath?: boolean;
  saveIfNotExist?: boolean;
  rewriteCLIConfig?: boolean;
  rewriteENVConfig?: boolean;
  enumsAsString?: boolean;
  exitOnConfig?: boolean;
}

export interface ConfigClassOptions extends ConfigClassOptionsBase {
  attachDescription?: boolean;
  attachDefaults?: boolean;
  configPath?: string;
  saveIfNotExist?: boolean;
  rewriteCLIConfig?: boolean;
  rewriteENVConfig?: boolean;
  enumsAsString?: boolean;
  disableMan?: boolean;
  exitOnConfig?: boolean;

  cli?: {
    prefix?: string,
    enable?: ConfigCLIOptions,
    defaults?: {
      /**
       * Prefixes the default value overwrites
       */
      prefix?: string,
      /**
       * Enables overwriting the default values
       */
      enabled?: boolean
    }
  };
}

const cliMap = {
  attachDescription: 'attachDesc',
  attachDefaults: 'attachDefs',
  configPath: 'path',
  saveIfNotExist: 'save-if-not-exist',
  rewriteCLIConfig: 'rewrite-cli',
  rewriteENVConfig: 'rewrite-env',
  enumsAsString: 'string-enum',
  exitOnConfig: 'save-and-exist',
};

function parseCLIOptions(options: ConfigClassOptions) {
  console.log(optimist.argv);
  for (let key in cliMap) {
    const cliSwitch = (options.cli.prefix + '-' + (<any>cliMap)[key]);
    if ((<any>options.cli.enable)[key] === true &&
      typeof optimist.argv[cliSwitch] !== 'undefined') {
      (<any>options)[key] = optimist.argv[cliSwitch];
    }
  }

  return options;
}

export function ConfigClass(options: ConfigClassOptions = {}): any {
  options.saveIfNotExist = typeof options.saveIfNotExist !== 'undefined' ? options.saveIfNotExist : true;
  options.cli = options.cli || <any>{};
  options.cli.enable = options.cli.enable || {};
  options.cli.prefix = options.cli.prefix || 'config';
  options.cli.defaults = options.cli.defaults || {};
  options.cli.defaults.prefix = options.cli.defaults.prefix || 'default';
  options = parseCLIOptions(options);
  return (constructorFunction: new (...args: any[]) => any) => {
    return class ConfigClass extends AbstractRootConfigClass(constructorFunction, options) implements IConfigClassPrivate {


      constructor(...args: any[]) {
        super(args);

        if (optimist.argv['--help']) {
          console.log(this.__printMan());
        }
      }


      async loadDefaults(): Promise<any> {
        if (options.configPath) {

          try {
            const config: { __defaults?: any } = JSON.parse(await fsp.readFile(options.configPath, 'utf8'));
            if (typeof config.__defaults !== 'undefined') {
              this.__loadDefaultsJSONObject(config.__defaults);
              this.__loadJSONObject(config.__defaults);
            }
          } catch (e) {

          }
        }

        const cliConfig = ConfigLoader.getCLIArgsAsObject();
        if (options.cli.defaults.enabled === true && cliConfig[options.cli.defaults.prefix]) {
          this.__loadDefaultsJSONObject(cliConfig[options.cli.defaults.prefix]);
          this.__loadJSONObject(cliConfig[options.cli.defaults.prefix]);
        }
        const envConfig = ConfigLoader.getENVArgsAsObject(this.__getENVAliases());
        if (options.cli.defaults.enabled === true && envConfig[options.cli.defaults.prefix]) {
          this.__loadDefaultsJSONObject(envConfig[options.cli.defaults.prefix]);
          this.__loadJSONObject(envConfig[options.cli.defaults.prefix]);
        }
      }

      async load(): Promise<any> {
        await this.loadDefaults();

        if (options.configPath) {

          try {
            const config: { __defaults?: any } = JSON.parse(await fsp.readFile(options.configPath, 'utf8'));
            delete config.__defaults;
            this.__loadJSONObject(config);
          } catch (e) {

          }
        }
        let shouldSave = false;
        let cliParsed = false;
        let envParsed = false;

        const processOptions = (config: { [p: string]: any }) => {
          // process values only
          if (options.cli.defaults.enabled === true && config[options.cli.defaults.prefix]) {
            delete config[options.cli.defaults.prefix];
          }
          return this.__loadJSONObject(config);
        };

        if (options.rewriteCLIConfig === true) {
          shouldSave = processOptions(ConfigLoader.getCLIArgsAsObject()) || shouldSave;
          cliParsed = true;
        }
        if (options.rewriteENVConfig === true) {
          shouldSave = processOptions(ConfigLoader.getENVArgsAsObject(this.__getENVAliases())) || shouldSave;
          envParsed = true;
        }

        let exists = false;

        try {
          await fsp.access(options.configPath);
          exists = true;
        } catch (e) {

        }
        if ((options.saveIfNotExist === true && exists === false) || shouldSave) {
          await this.save();
          if (options.exitOnConfig === true) {
            process.exit(0);
          }
        }

        if (cliParsed === false) {
          processOptions(ConfigLoader.getCLIArgsAsObject());
        }
        if (envParsed === false) {
          processOptions(ConfigLoader.getENVArgsAsObject(this.__getENVAliases()));
        }
      }

      async save(): Promise<any> {
        if (options.configPath) {
          await ConfigLoader.saveJSONConfigFile(options.configPath, this);
        }
      }


      __printMan(): string {
        let ret = 'Usage: <appname> [options] \n';

        const pad: number = options.cli.prefix.length + 26;
        ret += '\nMeta cli options: \n';
        ret += '--help'.padEnd(pad) + ' prints this manual \n';
        if (options.cli.enable.configPath === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.configPath).padEnd(pad) + ' sets the config file location \n';
        }
        if (options.cli.enable.attachDefaults === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.attachDefaults).padEnd(pad) + ' prints the defaults to the config file \n';
        }
        if (options.cli.enable.attachDescription === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.attachDescription).padEnd(pad) + ' prints description to the config file \n';
        }
        if (options.cli.enable.rewriteCLIConfig === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.rewriteCLIConfig).padEnd(pad) + ' updates the config file with the options from cli switches \n';
        }
        if (options.cli.enable.rewriteENVConfig === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.rewriteENVConfig).padEnd(pad) + ' updates the config file with the options from environmental variables \n';
        }
        if (options.cli.enable.enumsAsString === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.enumsAsString).padEnd(pad) + ' enums are stored as string in the config file (instead of numbers) \n';
        }
        if (options.cli.enable.saveIfNotExist === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.saveIfNotExist).padEnd(pad) + ' creates config file if not exist \n';
        }
        if (options.cli.enable.exitOnConfig === true) {
          ret += ('--' + options.cli.prefix + '-' + cliMap.exitOnConfig).padEnd(pad) + ' creates config file and terminates \n';
        }

        ret += '\n<appname> can be configured through the configuration file, cli switches and environmental variables. \n';
        ret += 'All settings are case sensitive. \n';
        ret += 'Example for setting config MyConf through cli: \'<appname> --MyConf=5\' \n';
        ret += 'and through env variable: \'SET MyConf=5\' . \n';

        if (options.cli.defaults.enabled) {
          ret += '\nDefault values can be also overwritten by prefixing the options with \'' + options.cli.defaults.prefix + '-\', \n';
          ret += ' like \'<appname> --' + options.cli.defaults.prefix + '-MyConf=5\' and  \'SET ' + options.cli.defaults.prefix + '-MyConf=5\'\n';
        }
        ret += '\nApp CLI options: \n' + this.___printOption('--', false);
        ret += '\nEnvironmental variables: \n' + this.___printOption('', true);
        return ret;
      }


    };
  };
}

