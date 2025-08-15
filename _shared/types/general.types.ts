export type CustomClientException = {
    error: string,
    errorCode: string,
    extraMessage?: string,
    extraMessageCode?: string,
    validationErrors?: {
        error: string,
        errorCode: string,
        entry: string
    }[]
};

export type CustomValidationException = {
    type: string,
    error: string,
    extra_message?: any | null,
    insertThese?: string[],
    formEntry?: string
}

export interface LanguageError {
    message: string;
    error_code: string;
    extra_messages?: Record<string, string>;
}

export interface LanguageType {
    [key: string]: LanguageError;
}

export interface LanguageFile {
    serverExceptions: LanguageType,
    validationExceptions: {
        [type: string]: LanguageType;
    },
    notFound: {
        not_defined_error: LanguageError;
    };
}

export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
    NOT_IMPLEMENTED = 501,
}

export type PhoneNumber = {
    prefix: string,
    number: string
}
