import cors from 'cors';
import mongoose from "mongoose";
import {formatBytes} from "@utilities";
import {json, urlencoded} from "body-parser";
import express, {Application} from 'express';
import {CONSTANTS, SERVER} from "@environment";
import {getLogger, Logger} from "@loggers/serverLogger";
import {connectToMongoDb} from "@connections/connectToMongoDb";
import {CustomServerException, customServerExceptionToCustomClientException} from "@_shared/exceptions/exceptions";

// dotenv.config();
export const application = express();

// ============================================================================
// Functions
// ============================================================================
function updateUncaughtException(parentAction: number) {
    let logger = getLogger("serverUncaughtExceptionUpdater", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace();
    logger.start();
    logger.debug("Setting up uncaught exception handler");
    process.on('uncaughtException', (err) => {
        logger.err(`Uncaught Exception: ${err.message}`);
    });
    logger.debug("Finished setting up uncaught exception handler");
    logger.finish();
    logger.updateSpace(-1);
}
function updateUnhandledRejection(parentAction: number) {
    let logger = getLogger("serverUnhandledRejectionUpdater", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace();
    logger.start();
    logger.debug("Setting up unhandled rejection handler");
    process.on('unhandledRejection', (reason) => {
        logger.err(`Unhandled Rejection: ${reason}`);
    });
    logger.debug("Finished setting up unhandled rejection handler");
    logger.finish();
    logger.updateSpace(-1);
}
function updateCorsSettings(parentAction: number) {
    let logger = getLogger("serverCorsSettingsUpdater", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace();
    logger.start();
    logger.debug("Setting up CORS settings");
    const corsSettings = {
        origin: SERVER.ALLOWED_ORIGINS?.split(','),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }
    application.use(cors(corsSettings));
    logger.updateSpace();
    for( let key of Object.keys(corsSettings) ) {
        logger.debug(`"${key}": "${corsSettings[key]}"`);
    }
    logger.updateSpace(-1);
    logger.debug("Finished setting up CORS settings");
    logger.finish();
    logger.updateSpace(-1);
}
function updateSecurityHeaders(parentAction: number) {
    let logger = getLogger("serverSecurityHeadersUpdater", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace();
    logger.start();
    logger.debug("Setting up security headers");
    const securityHeaders = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    }
    application.use((req, res, next) => {
        for( let key of Object.keys(securityHeaders) ) {
            res.setHeader(key, securityHeaders[key]);
        }
        next();
    });
    logger.updateSpace();
    for( let key of Object.keys(securityHeaders) ) {
        logger.debug(`"${key}": "${securityHeaders[key]}"`);
    }
    logger.updateSpace(-1);
    logger.debug("Finished setting up security headers");
    logger.finish();
    logger.updateSpace(-1);
}
function updateBodyParser(parentAction: number) {
    let logger = getLogger("serverBodyParserUpdater", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace();
    logger.start();
    logger.debug("Setting up body parser");
    application.use(json({ limit: '10mb' }));
    application.use(urlencoded({ extended: true, limit: '10mb' }));
    logger.debug("Finished setting up body parser");
    logger.finish();
    logger.updateSpace(-1);
}
function updateServerConfiguration(parentAction: number){
    let logger = getLogger("serverConfigurationUpdater", Logger.SERVER, Logger.SERVER, parentAction);
    let now = new Date();
    logger.updateSpace();
    logger.start();
    logger.debug(`Physical server is at: ${now.toString()}`);
    process.env.TZ = SERVER.TIMEZONE;
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    now = new Date();
    logger.debug(`Server is set to: ${now.toString()}`);
    logger.finish();
    logger.updateSpace(-1);
}
function setupEndpointsErrorHandling(application: Application, parentAction: number){

    const logger = getLogger("setting_up_endpoint_error_handling", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace(1);
    logger.start();

    logger.debug(`Setting up endpoint error handling`);
    application.use((error: Error, req, res, next) => {
        try{
            if (error instanceof CustomServerException) {
                return res.status(error?.httpStatus || 400).json(customServerExceptionToCustomClientException(error, req.languageCode || CONSTANTS.DEFAULT_LANGUAGE));
            }
            return res.status(500).json({
                message: 'Something went wrong. Please try again later.',
            });
        }catch(error: any){
            return res.status(400).json({error: "Error"});
        }
    });

    logger.debug(`Finished setting up endpoint error handling`);
    logger.finish();
    logger.updateSpace(-1);
}
function addHealthCheck(parentAction: number) {
    let logger = getLogger("serverHealthCheckEndpointMounter", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace();
    logger.start();
    logger.debug(`Adding server health check endpoint`);
    application.get('/health', async (req, res, next) => {
        try {
            let remaining = process.uptime() * 1000;
            const msInSec = 1000;
            const msInMin = msInSec * 60;
            const msInHour = msInMin * 60;
            const msInDay = msInHour * 24;

            const days = Math.floor(remaining / msInDay);
            remaining %= msInDay;
            const hours = Math.floor(remaining / msInHour);
            remaining %= msInHour;
            const minutes = Math.floor(remaining / msInMin);
            remaining %= msInMin;
            const seconds = Math.floor(remaining / msInSec);
            remaining %= msInSec;
            const milliseconds = Math.floor(remaining);

            let health = {
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: {
                    days,
                    hours,
                    minutes,
                    seconds,
                    milliseconds
                },
                environment: SERVER.NODE_ENV,
            }
            if( ["development", "staging"].includes(SERVER.NODE_ENV) ){
                health["database"] = {
                    connected: mongoose.connection.readyState === 1,
                    readyState: mongoose.connection.readyState,
                    database: mongoose.connection.name,
                    host: mongoose.connection.host,
                    port: mongoose.connection.port
                }
                health["memory"] = {
                    used: formatBytes(process.memoryUsage().heapUsed),
                    total: formatBytes(process.memoryUsage().heapTotal)
                }
            }
            res.status(200).json(health);

        }
        catch (error) {
            logger.err('Health check failed');
            res.status(503).json({
                status: 'ERROR',
                timestamp: new Date().toISOString(),
                error: 'Health check failed'
            });
        }
    });
    logger.debug(`Finished adding server health check endpoint`);
    logger.finish();
    logger.updateSpace(-1);
}
function mountApiEndpoints(parentAction: number) {
    let logger = getLogger("serverApiEndpointsMounter", Logger.SERVER, Logger.SERVER, parentAction);
    logger.updateSpace();
    logger.start();
    logger.debug(`Mounting API endpoints`);
    logger.updateSpace();

    // mound api endpoints here
    // logger.debug('Registering ${routerName} routes: "/${endpointName}"');
    // application.use('${path}', require('${filePath}').router);

    logger.updateSpace(-1);
    logger.debug(`Finished mounting API endpoints`);
    logger.finish();
    logger.updateSpace(-1);

}
// ============================================================================

// ============================================================================
// SERVER SETUP
// ============================================================================
const logger = getLogger("severInitialization", Logger.SERVER, Logger.SERVER);
logger.start();
logger.info('Starting express server...');
logger.updateSpace(1);

logger.info("Setting up uncaughtException handler");
updateUncaughtException(logger.action);
logger.info("Finished setting up uncaughtException handler");

logger.info("Setting up unhandledRejection handler");
updateUnhandledRejection(logger.action);
logger.info("Finished setting up unhandledRejection handler");

logger.info("Setting up CORS");
updateCorsSettings(logger.action);
logger.info("Finished setting up CORS");

logger.info("Setting up security headers");
updateSecurityHeaders(logger.action);
logger.info("Finished setting up security headers");

logger.info("Setting up body parser");
updateBodyParser(logger.action);
logger.info("Finished setting up body parser");

logger.debug("Setting up server configuration");
updateServerConfiguration(logger.action);
logger.debug("Finished setting up server configuration");

logger.debug("Setting up server health check endpoint");
addHealthCheck(logger.action);
logger.debug("Finished setting up server health check endpoint");

logger.debug(`Opening server port to listen to: [${SERVER.PORT}]`);

application.listen(SERVER.PORT, async () => {

    await connectToMongoDb("mongoDb", logger.action);

    logger.debug("Mounting api endpoints");
    mountApiEndpoints(logger.action);
    logger.debug("Finished mounting api endpoints");

    logger.debug('Setting up server endpoint error handling');
    setupEndpointsErrorHandling(application, logger.action);
    logger.debug(`Finished setting up server endpoint error handling`);

    logger.debug(`✅ Server is running successfully! [EnvironmentL: ${SERVER.NODE_ENV}]`);
    logger.debug(`🔍 Health Check: http://localhost:${SERVER.PORT}/health`);
    logger.debug(`🎯 API Base URL: http://localhost:${SERVER.PORT}/api/${SERVER.API_VERSION}`);
    logger.debug('🔧 Press Ctrl+C to stop the server');

    logger.updateSpace(-1);
    logger.info("Finished setting up express server");
    logger.finish();
});






