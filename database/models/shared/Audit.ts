import {Model, Query, Schema, Types, UpdateQuery} from "mongoose";
import {CustomServerException} from "@_shared/exceptions/exceptions";


export interface SoftDeleteOptions {
    includeDeleted?: boolean;
}

export interface AuditVirtuals {
    isDeleted: boolean;
    auditInfo: {
        createdAt: Date;
        createdBy: Types.ObjectId;
        updatedAt: Date;
        updatedBy?: Types.ObjectId;
        deletedAt?: Date;
        deletedBy?: Types.ObjectId;
        version: number;
    }
}

export interface Audit extends AuditVirtuals{
    createdAt: Date;
    createdBy?: Types.ObjectId;
    updatedAt: Date;
    updatedBy?: Types.ObjectId;
    deletedAt?: Date;
    deletedBy?: Types.ObjectId; // everything is soft-deleted
    restoredBy?: Types.ObjectId;
    version: number;

    softDelete(deletedBy?: Types.ObjectId): Promise<void>;
    restore(restoredBy?: Types.ObjectId): Promise<void>;
}

export const AuditSchema = new Schema<Audit>({
    createdAt: { 
        type: Date, 
        required: true, 
        default: Date.now,
        validate: {
            validator: function(value: Date) {
                return value instanceof Date && !isNaN(value.getTime());
            },
            message: 'Invalid creation date'
        }
    },
    createdBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        validate: {
            validator: function(value: Types.ObjectId) {
                return Types.ObjectId.isValid(value);
            },
            message: 'Invalid user reference for createdBy'
        }
    },
    updatedAt: { 
        type: Date, 
        required: true, 
        default: Date.now,
        validate: {
            validator: function(value: Date) {
                return value instanceof Date && !isNaN(value.getTime());
            },
            message: 'Invalid update date'
        }
    },
    updatedBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',
        validate: {
            validator: function(value?: Types.ObjectId) {
                return !value || Types.ObjectId.isValid(value);
            },
            message: 'Invalid user reference for updatedBy'
        }
    },
    deletedAt: { 
        type: Date,
        validate: {
            validator: function(value?: Date) {
                return !value || (value instanceof Date && !isNaN(value.getTime()));
            },
            message: 'Invalid deletion date'
        }
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: function(value?: Types.ObjectId) {
                return !value || Types.ObjectId.isValid(value);
            },
            message: 'Invalid user reference for deletedBy'
        }
    },
    restoredBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: function(value?: Types.ObjectId) {
                return !value || Types.ObjectId.isValid(value);
            },
            message: 'Invalid user reference for restoredBy'
        }
    },
    version: {
        type: Number, 
        required: true, 
        default: 0,
        min: 0,
        validate: {
            validator: function(value: number) {
                return Number.isInteger(value) && value >= 0;
            },
            message: 'Version must be a positive integer'
        }
    }
}, {timestamps: false});

// Add virtuals for convenience
AuditSchema.virtual('isDeleted').get(function() {
    return !!this.deletedAt;
});
AuditSchema.virtual('auditInfo').get(function() {
    return {
        createdAt: this.createdAt,
        createdBy: this.createdBy,
        updatedAt: this.updatedAt,
        updatedBy: this.updatedBy,
        deletedAt: this.deletedAt,
        deletedBy: this.deletedBy,
        version: this.version,
        isDeleted: !!this.deletedAt
    };
});

// Add indexes
AuditSchema.index({ deletedAt: 1 });
AuditSchema.index({ createdAt: 1 });
AuditSchema.index({ updatedAt: 1 });
AuditSchema.index({ createdBy: 1 });
AuditSchema.index({ updatedBy: 1 });
AuditSchema.index({ deletedBy: 1 });
AuditSchema.index({ version: 1 });

// Ensure virtuals are included in JSON output
AuditSchema.set('toJSON', { virtuals: true });
AuditSchema.set('toObject', { virtuals: true });

// Instance methods
AuditSchema.methods.softDelete = async function(deletedBy?: Types.ObjectId): Promise<void> {
    if (this.deletedAt) {
        throw new CustomServerException("mongoDb", "delete");
    }
    this.deletedAt = new Date();
    this.deletedBy = deletedBy || null;
    this.updatedAt = new Date();
    await this.save();
};
AuditSchema.methods.restore = async function(restoredBy?: Types.ObjectId): Promise<void> {
    if (!this.deletedAt) {
        throw new CustomServerException("mongoDb", "restore");
    }
    if (!!restoredBy) {
        this.restoredBy = restoredBy;
    }
    this.deletedAt = null;
    this.deletedBy = null;
    this.updatedBy = restoredBy || null;
    this.updatedAt = new Date();
    this.version = ((this.version as number) || 0) + 1;
    await this.save();
};

AuditSchema.statics.softDelete = async function(filter: any, deletedBy?: Types.ObjectId): Promise<void> {
    await this.updateMany(
        {
            ...filter,
            deletedAt: null
        },
        {
            $set: {
                deletedAt: new Date(),
                updatedAt: new Date(),
                deletedBy: deletedBy || null
            },
            $inc: { version: 1 }
        }
    );
};
AuditSchema.statics.bulkSoftDelete = async function(filter: any, deletedBy?: Types.ObjectId): Promise<void> {
    await this.updateMany(
        {
            ...filter,
            deletedAt: null
        },
        {
            $set: {
                deletedAt: new Date(),
                updatedAt: new Date(),
                deletedBy: deletedBy || null
            },
            $inc: { version: 1 }
        }
    );
};
AuditSchema.statics.bulkRestore = async function(filter: any, restoredBy?: Types.ObjectId): Promise<void> {
    await this.updateMany(
        {
            ...filter,
            deletedAt: { $ne: null }
        },
        {
            $set: {
                deletedAt: null,
                deletedBy: null,
                restoredBy: restoredBy || null,
                updatedAt: new Date()
            },
            $inc: { version: 1 }
        }
    );
};

AuditSchema.pre('save', function (next) {
    const modifiedPaths = this.modifiedPaths();
    
    // Prevent saving already deleted documents (unless we're restoring)
    if (this.deletedAt && !modifiedPaths.includes("deletedAt")) {
        throw new CustomServerException("mongoDb", "save");
    }

    // Set creation timestamp only on new documents
    if (this.isNew) {
        this.createdAt = new Date();
    }

    // Always update the updatedAt timestamp
    this.updatedAt = new Date();

    // Increment version only if document is modified (excluding audit fields)
    if (this.isModified()) {
        const auditFields = ['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy', 'restoredBy', 'version'];
        const hasNonAuditChanges = modifiedPaths.some(path => !auditFields.includes(path));

        if (hasNonAuditChanges) {
            this.version = ((this.version as number) || 0) + 1;
        }
    }

    next();
});
AuditSchema.pre('aggregate', function (next) {
    const opts = this.options as SoftDeleteOptions;
    if (!opts?.includeDeleted) {
        // Add $match stage to exclude deleted documents
        this.pipeline().unshift({ $match: { deletedAt: null } });
    }
    next();
});
AuditSchema.pre('find', function (next) {
    const query = this as Query<any, any> & { options?: SoftDeleteOptions };
    if (!query.options?.includeDeleted) {
        query.where({ deletedAt: null });
    }
    next();
});
AuditSchema.pre('findOne', function (next) {
    const query = this as Query<any, any> & { options?: SoftDeleteOptions };
    if (!query.options?.includeDeleted) {
        query.where({ deletedAt: null });
    }
    next();
});
AuditSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) {
    const update = this.getUpdate() as UpdateQuery<any> || {};
    if (update && typeof update === 'object' && update.deletedAt) {
        throw new CustomServerException("mongoDb", "update");
    }
    if (!update.$set) update.$set = {};
    update.$set.updatedAt = new Date();
    update.$inc = update.$inc || {};
    (update.$inc as any).version = 1;
    this.setUpdate(update);
    next();
});
AuditSchema.pre('replaceOne', function (next) {
    const replacement = this.getUpdate() as any || {};
    if (replacement && typeof replacement === 'object' && replacement.deletedAt) {
        throw new CustomServerException("mongoDb", "replace");
    }
    replacement.updatedAt = new Date();
    replacement.version = ((replacement.version as number) || 0) + 1;
    this.setUpdate(replacement);
    next();
});
AuditSchema.pre('findOneAndDelete', {query: true, document: false}, async function (next) {
    await (this.model as Model<any>).updateOne(this.getQuery(), {
        $set: {
            deletedAt: new Date(),
            updatedAt: new Date()
        },
        $inc: { version: 1 }
    });
    this.where({ _id: null });
    next();
});
AuditSchema.pre(['deleteOne', 'deleteMany'], {query: true, document: false}, async function (next) {
    await (this.model as Model<any>).updateMany(this.getQuery(), {
        $set: {
            deletedAt: new Date(),
            updatedAt: new Date()
        },
        $inc: { version: 1 }
    });

    if( !this.getOptions().justDelete ) {
        this.where({ _id: null });
    }

    next();
});
AuditSchema.pre('countDocuments', function (next) {
    const query = this as Query<any, any> & { options?: SoftDeleteOptions };
    if (!query.options?.includeDeleted) {
        query.where({ deletedAt: null });
    }
    next();
});
AuditSchema.pre('estimatedDocumentCount', function (next) {
    const query = this as Query<any, any> & { options?: SoftDeleteOptions };
    if (!query.options?.includeDeleted) {
        query.where({ deletedAt: null });
    }
    next();
});
AuditSchema.pre('distinct', function (next) {
    const query = this as Query<any, any> & { options?: SoftDeleteOptions };
    if (!query.options?.includeDeleted) {
        query.where({ deletedAt: null });
    }
    next();
});
