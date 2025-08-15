import mongoose, { Mongoose } from "mongoose";
import {getLogger, Logger} from "@loggers/serverLogger";
import {MONGO_DB} from "@environment";

export const mongooseInstance = require("mongoose");

mongooseInstance.set('strictQuery', true);
let retryCount = 0;
let firstConnection = true;

export async function connectToMongoDb(instance: string, parentAction?: number, canInitialize?: boolean): Promise<void> {

    let logger = getLogger("connectingToMongoDbInstance", Logger.DATABASE, Logger.DATABASE, parentAction);
    logger.updateSpace();
    logger.start();
    // logger.debug(`${MONGO_DB.PRE_HOST + MONGO_DB.USER}:${MONGO_DB.PASSWORD}@${MONGO_DB.HOST + (MONGO_DB.PORT !== "" ? (":" + MONGO_DB.PORT) : "")}/${MONGO_DB.DB_NAME + MONGO_DB.PARAMS}&tlsCAFile=${MONGO_DB.ROOT_CA_CERT_PATH}&tlsCertificateKeyFile=${MONGO_DB.TLS_CERTIFICATE_KEY_FILE_PATH}`);

    const connectWithRetry = async (): Promise<Mongoose> => {
        try {
            logger.debug(`Attempting MongoDB connection [${retryCount + 1}/${MONGO_DB.RETRY_CAP}]...`);
            const instance = await mongoose.connect(`${MONGO_DB.PRE_HOST + MONGO_DB.USER}:${MONGO_DB.PASSWORD}@${MONGO_DB.HOST + (MONGO_DB.PORT !== "" ? (":" + MONGO_DB.PORT) : "")}/${MONGO_DB.DB_NAME + MONGO_DB.PARAMS}&tlsCAFile=${MONGO_DB.ROOT_CA_CERT_PATH}&tlsCertificateKeyFile=${MONGO_DB.TLS_CERTIFICATE_KEY_FILE_PATH}`);
            logger.info('MongoDB connected');
            retryCount = 0;
            return instance;
        } catch (error) {
            retryCount++;
            logger.err(`MongoDB connection failed: ${error.message}. Retrying in ${MONGO_DB.CONNECTION_TIMER} ms.`);
            if (retryCount >= MONGO_DB.RETRY_CAP) {
                logger.fail('Exceeded MongoDB retry limit. Exiting...');
                process.exit(1);
            }
            await new Promise(res => setTimeout(res, MONGO_DB.CONNECTION_TIMER));
            return connectWithRetry();
        }
    };

    logger.debug("Setting up MongoDB instance");
    logger.updateSpace();

    logger.debug("Setting up onConnected handler");
    mongooseInstance.connection.on('connected', () => {
        retryCount = 0;
        logger.info(`MongoDB connected successfully. ReadyState: [${mongooseInstance.connection.readyState}]`);
    });
    logger.debug("Finished setting up onConnected handler");

    logger.debug("Setting up onError handler");
    mongooseInstance.connection.on('error', (error) => {
        logger.err(`MongoDB connection error. Message: ${error.message}. ReadyState: [${mongooseInstance.connection.readyState}]`);
    });
    logger.debug("Finished setting up onError handler");

    logger.debug("Setting up onDisconnected handler");
    mongooseInstance.connection.on('disconnected', async (ee: any) => {
        if( !firstConnection ) {
            retryCount++;
            logger.warn(`MongoDB disconnected. ReadyState: [${mongooseInstance.connection.readyState}]. Retrying in ${MONGO_DB.CONNECTION_TIMER} ms. This connection CANNOT FAIL.`);
            if (retryCount >= MONGO_DB.RETRY_CAP) {
                logger.fail('Exceeded MongoDB retry limit. Exiting...');
                process.exit(1);
            }
            await new Promise((res) => {setTimeout(() => {res(true);}, MONGO_DB.CONNECTION_TIMER)});
            try{
                await mongoose.connect(`${MONGO_DB.PRE_HOST + MONGO_DB.USER}:${MONGO_DB.PASSWORD}@${MONGO_DB.HOST + (MONGO_DB.PORT !== "" ? (":" + MONGO_DB.PORT) : "")}/${MONGO_DB.DB_NAME + MONGO_DB.PARAMS}`);
            }catch(err){
                logger.err(`MongoDB connection error. Error: ${err.message}`);
            }
        }
    });
    logger.debug("Finished setting up onDisconnected handler");

    logger.debug("Setting up onReconnected handler");
    mongooseInstance.connection.on('reconnected', () => {
        logger.info(`MongoDB reconnected. ReadyState: [${mongooseInstance.connection.readyState}]`);
    });
    logger.debug("Finished setting up onReconnected handler");

    logger.debug("Setting up SIGINT handler");
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, closing database connection...');
        try {
            await mongoose.disconnect();
            logger.info('Database connection closed successfully');
        }
        catch (error) {
            logger.err('Error closing database connection');
        }
        process.exit(0);
    });
    logger.debug("Finished setting up SIGINT handler");

    logger.debug("Setting up SIGTERM handler");
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, closing database connection...');
        try {
            await mongoose.disconnect();
            logger.info('Database connection closed successfully');
        }
        catch (error) {
            logger.err('Error closing database connection');
        }
        process.exit(0);
    });
    logger.debug("Finished setting up SIGTERM handler");

    logger.updateSpace(-1);
    logger.debug("Finished setting up MongoDB instance");

    await connectWithRetry();
    firstConnection = false;

    logger.finish();
}