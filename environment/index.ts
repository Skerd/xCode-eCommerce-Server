import * as process from "node:process";

export const SERVER = {
    PORT: parseInt(process.env.SERVER_PORT),
    NODE_ENV: process.env.SERVER_NODE_ENV,
    API_VERSION: process.env.SERVER_API_VERSION,
    CLIENT_BASE_URL: process.env.SERVER_CLIENT_BASE_URL,
    CORS_ORIGIN: process.env.SERVER_CORS_ORIGIN,
    ALLOWED_ORIGINS: process.env.SERVER_ALLOWED_ORIGINS,
    TIMEZONE: process.env.SERVER_TIMEZONE,
};

export const MONGO_DB = {
    PRE_HOST: process.env.MONGODB_PRE_HOST,
    HOST: process.env.MONGODB_HOST,
    PORT: process.env.MONGODB_PORT,
    DB_NAME: process.env.MONGODB_DB_NAME,
    USER: process.env.MONGODB_USER,
    PASSWORD: process.env.MONGODB_PASSWORD,
    PARAMS: process.env.MONGODB_PARAMS,
    CONNECTION_TIMER: parseInt(process.env.MONGODB_CONNECTION_TIMER),
    RETRY_CAP: parseInt(process.env.MONGODB_RETRY_CAP),
    INIT: process.env.MONGODB_INIT.toLowerCase().trim() === "true",
    AUTH_SOURCE: process.env.MONGODB_AUTH_SOURCE,
    REPLICA_SET: process.env.MONGODB_REPLICA_SET,
    ROOT_CA_CERT_PATH: process.env.MONGODB_ROOT_CA_CERT_PATH,
    TLS_CERTIFICATE_KEY_FILE_PATH: process.env.MONGODB_TLS_CERTIFICATE_KEY_FILE_PATH,
};

export const CONSTANTS = {
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES: process.env.SUPPORTED_LANGUAGES.split(",")
};

export const KAFKA = {
    BROKERS: process.env.KAFKA_BROKERS?.split(','),
    CLIENT_ID: process.env.KAFKA_CLIENT_ID,
    GROUP_ID: process.env.KAFKA_GROUP_ID,
    RETRY_CAP: parseInt(process.env.KAFKA_RETRY_CAP),
    CONNECTION_TIMER: parseInt(process.env.KAFKA_CONNECTION_TIMER),
    TOPICS: {
        USER_SIGNUP_REQUEST: 'user.signup.request',
        USER_SIGNUP_COMPLETED: 'user.signup.completed',
        USER_SIGNUP_FAILED: 'user.signup.failed'
    }
};

export const REDIS = {
    ROOT_NODES: process.env.REDIS_ROOT_NODES?.split(','),
    USERNAME: process.env.REDIS_USERNAME,
    PASSWORD: process.env.REDIS_PASSWORD,
    DATABASE: parseInt(process.env.REDIS_DATABASE),
    KEY_PREFIX: process.env.REDIS_KEY_PREFIX,
    CONNECT_TIMEOUT: parseInt(process.env.REDIS_CONNECT_TIMEOUT),
    CONNECTION_TIMER: parseInt(process.env.REDIS_CONNECTION_TIMER),
    RETRY_CAP: parseInt(process.env.REDIS_RETRY_CAP)
};