import {Schema} from "mongoose";
import {AuditSchema} from "@dbModels/shared/Audit";

/**
 * BaseSchema wraps Mongoose.Schema and automatically applies
 * audit + soft-delete logic to all models that extend it.
 */
export class BaseSchema<T> extends Schema<T> {
    constructor(definition: Record<string, any>, options?: any) {
        super(definition, options);
        this.add(AuditSchema);
    }
}