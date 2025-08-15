const {createLogger, transports, format} = require('winston');
import DailyRotateFile from 'winston-daily-rotate-file';

let ActionCount: number = 0;
function getActionCount(): number {
    return ++ActionCount;
}

const WinstonLogger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.simple()
    ),
    transports: [
        new transports.Console(),
        new DailyRotateFile({
            filename: 'logs/application/%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '2d'
        })
    ]
});

const dontPrintCodes = [];
type logMessageType = "err" | "warn" | "info" | "debug" | "default";
export enum Logger {
    SERVER = "SERVER",
    DATABASE = "DATABASE"
}

type logType = {
    message: any,
    type: logMessageType,
    actionInitializer?: string,
    action: number,
    code: string,
    preSpace: string
}
export function log(args: logType): string {
    // return;
    if (!!args.code && dontPrintCodes.includes(args.code)) {
        return;
    }
    const timeNow = (new Date()).toISOString();
    let actionNumber = ("000000000000" + args.action).slice(-12);
    let messageType = args.type.toUpperCase().padEnd(10, '_');
    let actionInitializer = args.actionInitializer.padStart(10, '_');
    let message = `[${timeNow}][${messageType}][${actionNumber}][${actionInitializer}]: ${args.preSpace}${args.message}`;
    let consoleMessage = `[${messageType}][${actionNumber}][${actionInitializer}]: ${args.preSpace}${args.message}`;

    if (args.type == "err") {
        console.error(consoleMessage);
        WinstonLogger.error(message);
    }
    else if (args.type == "warn") {
        console.warn(consoleMessage);
        WinstonLogger.warn(message);
    }
    else if (args.type == "info") {
        console.info(consoleMessage);
        WinstonLogger.info(message);
    }
    else if (args.type == "debug") {
        console.info(consoleMessage);
        WinstonLogger.info(message);
    }
    else {
        console.log(consoleMessage);
        WinstonLogger.log(message);
    }
    return message;
}

export type serverLogger = {
    start: Function,
    warn: Function,
    err: Function,
    info: Function,
    debug: Function,
    log: Function,
    fail: Function,
    finish: Function,
    action: number,
    renew: Function,
    updateSpace: Function,
    code: string
}
export function getLogger(code: string, actionInitializer: string, server: Logger, parentAction?: number): serverLogger {

    const space = "    ";
    let startEpoch = Date.now();
    let action = parentAction ?? getActionCount();
    let preSpace = parentAction ? "    " : "";

    function spaceUpdater(howMany: number = 1){
        if( howMany > 0 ){
            preSpace = preSpace + (space.repeat(howMany));
        }
        else{
            if( Math.abs(howMany) * space.length <= preSpace.length ){
                preSpace = preSpace.replace( space.repeat(Math.abs(howMany)), "" );
            }
            else{
                preSpace = "";
            }
        }
    }

    return {
        start: () => {
            log({
                message: `==== [${code}] starting ====`,
                type: "info",
                actionInitializer,
                action,
                code,
                preSpace
            });
            spaceUpdater();
        },
        warn: (message: string, context: any) => {
            log({
                message: message + ( !!context ? ` | Context: ${JSON.stringify(context)}` : "" ),
                type: "warn",
                actionInitializer,
                action,
                code,
                preSpace
            });
        },
        err: (message: string, context: any) => {
            log({
                message: message + ( !!context ? ` | Context: ${JSON.stringify(context)}` : "" ),
                type: "err",
                actionInitializer,
                action,
                code,
                preSpace
            });
        },
        info: (message: string, context: any) => {
            log({
                message: message + ( !!context ? ` | Context: ${JSON.stringify(context)}` : "" ),
                type: "info",
                actionInitializer,
                action,
                code,
                preSpace
            });
        },
        debug: (message: string, context: any) => {
            log({
                message: message + ( !!context ? ` | Context: ${JSON.stringify(context)}` : "" ),
                type: "debug",
                actionInitializer,
                action,
                code,
                preSpace
            });
        },
        log: (message: string, context: any) => {
            log({
                message: message + ( !!context ? ` | Context: ${JSON.stringify(context)}` : "" ),
                type: "default",
                actionInitializer,
                action,
                code,
                preSpace
            });
        },
        fail: (error: any) => {
            spaceUpdater(-1);
            if( !!error ){
                log({
                    message: JSON.stringify(error) !== "{}" ? JSON.stringify(error) : error.toString(),
                    type: "err",
                    actionInitializer,
                    action,
                    code,
                    preSpace
                });
            }
            log({
                message: `==== [${code}] failed in [${Date.now() - startEpoch}] ms ====`,
                type: "err",
                actionInitializer,
                action,
                code,
                preSpace
            });
        },
        finish: () => {
            spaceUpdater(-1);
            log({
                message: `==== [${code}] finished in [${Date.now() - startEpoch}] ms ====`,
                type: "info",
                actionInitializer,
                action,
                code,
                preSpace
            });
        },
        renew: (): serverLogger => {
            return getLogger(code, actionInitializer, server);
        },
        updateSpace: (howMany: number = 1) => {
            spaceUpdater(howMany);
        },
        action,
        code
    };

}