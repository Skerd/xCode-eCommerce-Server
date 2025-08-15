import {CONSTANTS} from "../../environment";
import * as en_lang from "@_shared/exceptions/languages/en.json";
import * as sq_lang from "@_shared/exceptions/languages/sq.json";
import {CustomClientException, CustomValidationException, HttpStatus, LanguageError, LanguageFile} from "@_shared/types/general.types";

const LANGUAGE_FILES: Record<string, LanguageFile> = {
    en: en_lang as LanguageFile,
    sq: sq_lang as LanguageFile,
};

export class CustomServerException extends Error {

    public readonly errorCode: string;
    public readonly extraMessageCode: string | null;
    public readonly content?: CustomValidationException[];
    public readonly httpStatus: HttpStatus;
    public readonly timestamp: Date;

    constructor(
        errorCode: string,
        extraMessageCode: string | null,
        content?: CustomValidationException[],
        httpStatus?: HttpStatus
    ) {
        super();
        this.errorCode = errorCode;
        this.extraMessageCode = extraMessageCode;
        this.content = content;
        this.httpStatus = httpStatus ?? HttpStatus.INTERNAL_SERVER_ERROR;
        this.timestamp = new Date();
        Error.captureStackTrace(this, this.constructor);
    }
}

export function customServerExceptionToCustomClientException( error: CustomServerException, languageCode: string ): CustomClientException {

    let customClientException: CustomClientException = {
        error: "",
        extraMessage: "",
        errorCode: "",
        extraMessageCode: ""
    }

    const languageFile = LANGUAGE_FILES[languageCode.toLowerCase()] || LANGUAGE_FILES[CONSTANTS.DEFAULT_LANGUAGE];

    let errorTemplate: LanguageError = languageFile["serverExceptions"][error.errorCode];
    if( !errorTemplate ) {
        // this means the error does not exist, therefore the server must throw a custom generic message
        errorTemplate = languageFile["notFound"]["not_defined_error"];
    }
    else{
        // Handle extra messages if available
        if( error.extraMessageCode && errorTemplate.extra_messages ){
            const extraMessage = errorTemplate.extra_messages[error.extraMessageCode];
            if (extraMessage) {
                customClientException.extraMessageCode = error.extraMessageCode
                customClientException.extraMessage = extraMessage;
            }
        }
        else{
            delete customClientException.extraMessage;
            delete customClientException.extraMessageCode;
        }

        if( !!error.content ){
            customClientException.validationErrors = [];
            // load validationExceptions
            let validationErrorTemplate = languageFile["validationExceptions"];
            for( let item of error.content ){
                if( !validationErrorTemplate[item.type] || !validationErrorTemplate[item.type][item.error] ){
                    let notfound = validationErrorTemplate["notFound"]["notDefinedError"];
                    customClientException.validationErrors.push({
                        error: notfound.message,
                        errorCode: item.error,
                        entry: item.formEntry
                    });
                }
                else{
                    let currentLanguage = validationErrorTemplate[item.type][item.error];
                    const regex = new RegExp("{}".replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

                    let fixedError = currentLanguage.message;
                    let replacementIndex = 0;
                    fixedError = fixedError.replace(regex, (match) => {
                        if (replacementIndex < item.insertThese.length) {
                            return String(item.insertThese[replacementIndex++]);
                        }
                        return match;
                    });
                    customClientException.validationErrors.push({
                        error: fixedError,
                        errorCode: item.error,
                        entry: item.formEntry
                    });
                }
            }
        }
    }

    customClientException.error = errorTemplate.message;
    customClientException.errorCode = errorTemplate.error_code;

    return customClientException;
}
