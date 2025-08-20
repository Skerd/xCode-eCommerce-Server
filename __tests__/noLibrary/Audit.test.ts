import mongoose from 'mongoose';
import { Audit } from '@dbModels/shared/Audit';
import {BaseSchema} from "@dbModels/shared/Base";

// Test interface extending Audit
interface TestDocument extends Audit {
    name: string;
    email: string;
    age: number;
}

// Create test schema
const TestSchema = new BaseSchema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    age: { type: Number, required: true }
});

// Add Audit schema to test schema
// TestSchema.add(AuditSchema);

// Create test model with type assertion for static methods
const TestModel = mongoose.model<TestDocument>('Test', TestSchema) as any & {
    softDelete(filter: any, deletedBy?: any): Promise<void>;
    bulkSoftDelete(filter: any, deletedBy?: any): Promise<void>;
    bulkRestore(filter: any, restoredBy?: any): Promise<void>;
};

// Test user IDs
const testUserId1 = new mongoose.Types.ObjectId();
const testUserId2 = new mongoose.Types.ObjectId();

class AuditTestSuite {
    private testResults: { test: string; passed: boolean; message?: string }[] = [];
    private testCount = 0;
    private passedCount = 0;

    private assert(condition: boolean, message: string): void {
        this.testCount++;
        if (condition) {
            this.passedCount++;
            this.testResults.push({ test: `Test ${this.testCount}`, passed: true });
            console.log(`✅ ${message}`);
        } else {
            this.testResults.push({ test: `Test ${this.testCount}`, passed: false, message });
            console.log(`❌ ${message}`);
        }
    }

    private async assertThrows(fn: () => Promise<any>, expectedError: string): Promise<void> {
        this.testCount++;
        try {
            await fn();
            this.testResults.push({ test: `Test ${this.testCount}`, passed: false, message: `Expected error: ${expectedError}` });
            console.log(`❌ Expected error: ${expectedError}`);
        } catch (error: any) {
            this.passedCount++;
            this.testResults.push({ test: `Test ${this.testCount}`, passed: true });
            console.log(`✅ Correctly threw error: ${error.message}`);
        }
    }

    private async assertCount(model: any, filter: any, expectedCount: number, options?: any): Promise<void> {
        let query = model.countDocuments(filter);
        if (options?.includeDeleted) {
            query = query.setOptions({ includeDeleted: true });
        }
        const count = await query;
        this.assert(count === expectedCount, `Expected ${expectedCount} documents, got ${count}`);
    }

    public async runAllTests(): Promise<void> {
        console.log('🚀 Starting Audit Model Test Suite...\n');

        // Clear test data
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testBasicCRUD();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testSoftDelete();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testRestore();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testBulkOperations();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testQueryMethods();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testUpdateMethods();
        // await TestModel.deleteMany({}).setOptions({justDelete: true});
        // await this.testDeleteMethods();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testCountMethods();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testVirtuals();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testAuditFields();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testErrorCases();
        await TestModel.deleteMany({}).setOptions({justDelete: true});
        await this.testIncludeDeletedOption();

        // Print summary
        console.log('\n📊 Test Summary:');
        console.log(`Total Tests: ${this.testCount}`);
        console.log(`Passed: ${this.passedCount}`);
        console.log(`Failed: ${this.testCount - this.passedCount}`);
        console.log(`Success Rate: ${((this.passedCount / this.testCount) * 100).toFixed(2)}%`);

    }

    private async testBasicCRUD(): Promise<void> {
        console.log('\n📝 Testing Basic CRUD Operations...');

        // Test create
        const doc1 = await TestModel.create({
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            createdBy: testUserId1
        });

        this.assert(doc1._id !== undefined, 'Document should be created with _id');
        this.assert(doc1.createdAt instanceof Date, 'Document should have createdAt timestamp');
        this.assert(doc1.updatedAt instanceof Date, 'Document should have updatedAt timestamp');
        this.assert(doc1.version === 1, 'New document should have version 1');
        this.assert(doc1.deletedAt === undefined, 'New document should not be deleted');

        // Test find
        const foundDoc = await TestModel.findOne({ name: 'John Doe' });
        this.assert(foundDoc !== null, 'Should find created document');
        this.assert(foundDoc?.name === 'John Doe', 'Found document should have correct name');

        // Test update
        const updatedDoc = await TestModel.findOneAndUpdate(
            { name: 'John Doe' },
            { age: 31, updatedBy: testUserId2 },
            { new: true }
        );

        this.assert(updatedDoc?.age === 31, 'Document should be updated');
        this.assert(updatedDoc?.version === 2, 'Version should be incremented');
        this.assert(updatedDoc?.updatedBy?.equals(testUserId2), 'updatedBy should be set');
    }

    private async testSoftDelete(): Promise<void> {
        console.log('\n🗑️ Testing Soft Delete Operations...');

        // Create test document
        const doc = await TestModel.create({
            name: 'Jane Doe',
            email: 'jane@example.com',
            age: 25,
            createdBy: testUserId1
        });

        // Test instance softDelete
        await doc.softDelete(testUserId2);
        this.assert(doc.deletedAt instanceof Date, 'Document should have deletedAt timestamp');
        this.assert(doc.deletedBy?.equals(testUserId2), 'deletedBy should be set');
        this.assert(doc.isDeleted === true, 'isDeleted virtual should be true');

        // Test static softDelete
        const doc2 = await TestModel.create({
            name: 'Bob Smith',
            email: 'bob@example.com',
            age: 35,
            createdBy: testUserId1
        });

        await TestModel.softDelete({ name: 'Bob Smith' }, testUserId2);
        const deletedDoc = await TestModel.findOne({ name: 'Bob Smith' });
        this.assert(deletedDoc === null, 'Soft deleted document should not be found in normal query');
    }

    private async testRestore(): Promise<void> {
        console.log('\n🔄 Testing Restore Operations...');

        // Create and soft delete document
        const doc = await TestModel.create({
            name: 'Alice Johnson',
            email: 'alice@example.com',
            age: 28,
            createdBy: testUserId1
        });

        await doc.softDelete(testUserId2);

        // Test restore
        await doc.restore(testUserId1);
        this.assert(doc.deletedAt === null, 'Document should not have deletedAt after restore');
        this.assert(doc.deletedBy === null, 'deletedBy should be null after restore');
        this.assert(doc.restoredBy?.equals(testUserId1), 'restoredBy should be set');
        this.assert(doc.isDeleted === false, 'isDeleted virtual should be false');
        this.assert(doc.version === 2, 'Version should be incremented after restore');

        // Test bulk restore
        const doc3 = await TestModel.create({
            name: 'Charlie Brown',
            email: 'charlie@example.com',
            age: 40,
            createdBy: testUserId1
        });

        await doc3.softDelete(testUserId2);
        await TestModel.bulkRestore({ name: 'Charlie Brown', deletedAt: { $ne: null } }, testUserId1);
        
        const restoredDoc = await TestModel.findOne({ name: 'Charlie Brown' });
        this.assert(restoredDoc !== null, 'Bulk restored document should be found');
    }

    private async testBulkOperations(): Promise<void> {
        console.log('\n📦 Testing Bulk Operations...');

        // Create multiple documents
        await TestModel.create([
            { name: 'User1', email: 'user1@example.com', age: 20, createdBy: testUserId1 },
            { name: 'User2', email: 'user2@example.com', age: 22, createdBy: testUserId1 },
            { name: 'User3', email: 'user3@example.com', age: 24, createdBy: testUserId1 }
        ]);

        // Test bulk soft delete
        await TestModel.bulkSoftDelete({ age: { $lt: 25 } }, testUserId2);
        
        await this.assertCount(TestModel, { age: { $lt: 25 } }, 0);
        await this.assertCount(TestModel, { age: { $lt: 25 } }, 3, { includeDeleted: true });

        // Test bulk restore
        await TestModel.bulkRestore({ age: { $lt: 25 }, deletedAt: { $ne: null } }, testUserId1);
        await this.assertCount(TestModel, { age: { $lt: 25 } }, 3);
    }

    private async testQueryMethods(): Promise<void> {
        console.log('\n🔍 Testing Query Methods...');

        // Create test documents
        await TestModel.create([
            { name: 'Query1', email: 'query1@example.com', age: 70, createdBy: testUserId1 },
            { name: 'Query2', email: 'query2@example.com', age: 72, createdBy: testUserId1 }
        ]);

        // Test find
        const docs = await TestModel.find({ age: { $gte: 70 } });
        this.assert(docs.length === 2, 'Find should return 2 documents');

        // Test findOne
        const doc = await TestModel.findOne({ name: 'Query1' });
        this.assert(doc?.name === 'Query1', 'findOne should return correct document');

        // Test findById
        const docById = await TestModel.findById(doc?._id);
        this.assert(docById?.name === 'Query1', 'findById should return correct document');

        // Soft delete one document
        await doc?.softDelete(testUserId2);

        // Test that deleted document is not found
        const deletedDoc = await TestModel.findOne({ name: 'Query1' });
        this.assert(deletedDoc === null, 'Soft deleted document should not be found');

        // Test with includeDeleted option
        const deletedDocWithOption = await TestModel.findOne(
            { name: 'Query1' }
        ).setOptions({ includeDeleted: true });
        this.assert(deletedDocWithOption !== null, 'Should find deleted document with includeDeleted option');
    }

    private async testUpdateMethods(): Promise<void> {
        console.log('\n✏️ Testing Update Methods...');

        // Create test document
        const doc = await TestModel.create({
            name: 'UpdateTest',
            email: 'update@example.com',
            age: 25,
            createdBy: testUserId1
        });

        // Test findOneAndUpdate
        const updatedDoc = await TestModel.findOneAndUpdate(
            { name: 'UpdateTest' },
            { age: 26, updatedBy: testUserId2 },
            { new: true }
        );

        this.assert(updatedDoc?.age === 26, 'findOneAndUpdate should update document');
        this.assert(updatedDoc?.version === 2, 'Version should be incremented');
        this.assert(updatedDoc?.updatedBy?.equals(testUserId2), 'updatedBy should be set');

        // Test findByIdAndUpdate
        const updatedById = await TestModel.findByIdAndUpdate(
            doc._id,
            { age: 27, updatedBy: testUserId1 },
            { new: true }
        );

        this.assert(updatedById?.age === 27, 'findByIdAndUpdate should update document');
        this.assert(updatedById?.version === 3, 'Version should be incremented again');

        // Test updateOne
        const updateResult = await TestModel.updateOne(
            { name: 'UpdateTest' },
            { age: 28, updatedBy: testUserId2 }
        );

        this.assert(updateResult.modifiedCount === 1, 'updateOne should modify one document');

        // Test updateMany
        await TestModel.create({
            name: 'UpdateTest2',
            email: 'update2@example.com',
            age: 25,
            createdBy: testUserId1
        });

        const updateManyResult = await TestModel.updateMany(
            { age: 25 },
            { age: 29, updatedBy: testUserId2 }
        );

        this.assert(updateManyResult.modifiedCount === 1, 'updateMany should modify documents');
    }

    private async testDeleteMethods(): Promise<void> {
        console.log('\n🗑️ Testing Delete Methods...');

        // Create test documents
        const doc1 = await TestModel.create({
            name: 'DeleteTest1',
            email: 'delete1@example.com',
            age: 30,
            createdBy: testUserId1
        });

        const doc2 = await TestModel.create({
            name: 'DeleteTest2',
            email: 'delete2@example.com',
            age: 31,
            createdBy: testUserId1
        });

        // Test findOneAndDelete
        const deletedDoc = await TestModel.findOneAndDelete({ name: 'DeleteTest1' });
        // this.assert(deletedDoc === null, 'findOneAndDelete should not return deleted document');
        // this.assert(deletedDoc?.deletedAt instanceof Date, 'Deleted document should have deletedAt');

        // Test findByIdAndDelete
        const deletedById = await TestModel.findByIdAndDelete(doc2._id);
        // this.assert(deletedById !== null, 'findByIdAndDelete should return deleted document');

        // Verify documents are soft deleted
        await this.assertCount(TestModel, { name: /DeleteTest/ }, 0);
        await this.assertCount(TestModel, { name: /DeleteTest/ }, 2, { includeDeleted: true });

        // Test deleteOne
        const doc3 = await TestModel.create({
            name: 'DeleteTest3',
            email: 'delete3@example.com',
            age: 32,
            createdBy: testUserId1
        });

        const deleteOneResult = await TestModel.deleteOne({ name: 'DeleteTest3' });
        this.assert(deleteOneResult.deletedCount === 1, 'deleteOne should soft delete one document');

        // Test deleteMany
        await TestModel.create([
            { name: 'DeleteTest4', email: 'delete4@example.com', age: 33, createdBy: testUserId1 },
            { name: 'DeleteTest5', email: 'delete5@example.com', age: 34, createdBy: testUserId1 }
        ]);

        const deleteManyResult = await TestModel.deleteMany({ age: { $gte: 33 } });
        this.assert(deleteManyResult.deletedCount === 2, 'deleteMany should soft delete multiple documents');
    }

    private async testCountMethods(): Promise<void> {
        console.log('\n📊 Testing Count Methods...');

        // Create test documents
        await TestModel.create([
            { name: 'Count1', email: 'count1@example.com', age: 40, createdBy: testUserId1 },
            { name: 'Count2', email: 'count2@example.com', age: 41, createdBy: testUserId1 },
            { name: 'Count3', email: 'count3@example.com', age: 42, createdBy: testUserId1 }
        ]);

        // Test countDocuments
        const count = await TestModel.countDocuments({ age: { $gte: 40 } });
        this.assert(count === 3, 'countDocuments should return correct count');

        // Soft delete one document
        await TestModel.softDelete({ name: 'Count1' });

        // Test count after soft delete
        const countAfterDelete = await TestModel.countDocuments({ age: { $gte: 40 } });
        this.assert(countAfterDelete === 2, 'countDocuments should exclude soft deleted documents');

        // Test count with includeDeleted
        const countWithDeleted = await TestModel.countDocuments(
            { age: { $gte: 40 } }, 
        ).setOptions({ includeDeleted: true });
        this.assert(countWithDeleted === 3, 'countDocuments with includeDeleted should include soft deleted documents');

        // Test estimatedDocumentCount
        const estimatedCount = await TestModel.estimatedDocumentCount();
        this.assert(estimatedCount >= 2, 'estimatedDocumentCount should return reasonable count');

        // Test distinct
        const distinctAges = await TestModel.distinct('age', { age: { $gte: 40 } });
        this.assert(distinctAges.length === 2, 'distinct should return unique ages excluding deleted documents');
    }

    private async testVirtuals(): Promise<void> {
        console.log('\n🔮 Testing Virtuals...');

        // Create test document
        const doc = await TestModel.create({
            name: 'VirtualTest',
            email: 'virtual@example.com',
            age: 35,
            createdBy: testUserId1
        });

        // Test isDeleted virtual
        this.assert(doc.isDeleted === false, 'isDeleted should be false for new document');

        // Soft delete and test
        await doc.softDelete(testUserId2);
        this.assert(doc.isDeleted === true, 'isDeleted should be true for deleted document');

        // Test auditInfo virtual
        const auditInfo = doc.auditInfo;
        this.assert(auditInfo.createdAt instanceof Date, 'auditInfo should have createdAt');
        this.assert(auditInfo.createdBy?.equals(testUserId1), 'auditInfo should have createdBy');
        this.assert(auditInfo.updatedAt instanceof Date, 'auditInfo should have updatedAt');
        this.assert(auditInfo.deletedAt instanceof Date, 'auditInfo should have deletedAt');
        this.assert(auditInfo.deletedBy?.equals(testUserId2), 'auditInfo should have deletedBy');
        this.assert(auditInfo.version === 1, 'auditInfo should have version');
        this.assert(auditInfo.isDeleted === true, 'auditInfo should have isDeleted flag');
    }

    private async testAuditFields(): Promise<void> {
        console.log('\n📋 Testing Audit Fields...');

        // Create document
        const doc = await TestModel.create({
            name: 'AuditTest',
            email: 'audit@example.com',
            age: 45,
            createdBy: testUserId1
        });

        // Test initial audit fields
        this.assert(doc.createdAt instanceof Date, 'Document should have createdAt');
        this.assert(doc.createdBy?.equals(testUserId1), 'Document should have createdBy');
        this.assert(doc.updatedAt instanceof Date, 'Document should have updatedAt');
        this.assert(doc.version === 1, 'Document should have initial version');

        // Update document
        const updatedDoc = await TestModel.findOneAndUpdate(
            { name: 'AuditTest' },
            { age: 46, updatedBy: testUserId2 },
            { new: true }
        );

        this.assert(updatedDoc?.updatedAt instanceof Date, 'Document should have updatedAt after update');
        this.assert(updatedDoc?.updatedBy?.equals(testUserId2), 'Document should have updatedBy');
        this.assert(updatedDoc?.version === 2, 'Document should have incremented version');

        // Soft delete and test audit fields
        await updatedDoc?.softDelete(testUserId1);
        this.assert(updatedDoc?.deletedAt instanceof Date, 'Document should have deletedAt after soft delete');
        this.assert(updatedDoc?.deletedBy?.equals(testUserId1), 'Document should have deletedBy');

        // Restore and test audit fields
        await updatedDoc?.restore(testUserId2);
        this.assert(updatedDoc?.deletedAt === null, 'Document should not have deletedAt after restore');
        this.assert(updatedDoc?.deletedBy === null, 'Document should not have deletedBy after restore');
        this.assert(updatedDoc?.restoredBy?.equals(testUserId2), 'Document should have restoredBy');
        this.assert(updatedDoc?.version === 3, 'Document should have incremented version after restore');
    }

    private async testErrorCases(): Promise<void> {
        console.log('\n⚠️ Testing Error Cases...');

        // Test soft deleting already deleted document
        const doc = await TestModel.create({
            name: 'ErrorTest',
            email: 'error@example.com',
            age: 50,
            createdBy: testUserId1
        });

        await doc.softDelete(testUserId2);
        await this.assertThrows(
            () => doc.softDelete(testUserId1),
            'Cannot soft delete already deleted document'
        );

        // Test restoring non-deleted document
        const doc2 = await TestModel.create({
            name: 'ErrorTest2',
            email: 'error2@example.com',
            age: 51,
            createdBy: testUserId1
        });

        await this.assertThrows(
            () => doc2.restore(testUserId1),
            'Cannot restore non-deleted document'
        );

        // Test updating deletedAt directly
        await this.assertThrows(
            () => TestModel.findOneAndUpdate(
                { name: 'ErrorTest2' },
                { deletedAt: new Date() }
            ),
            'Cannot update deletedAt field directly'
        );

        // Test replacing with deletedAt
        await this.assertThrows(
            () => TestModel.replaceOne(
                { name: 'ErrorTest2' },
                { name: 'ErrorTest2', deletedAt: new Date() }
            ),
            'Cannot replace with deletedAt field'
        );
    }

    private async testIncludeDeletedOption(): Promise<void> {
        console.log('\n🔍 Testing Include Deleted Option...');

        // Create and soft delete document
        const doc = await TestModel.create({
            name: 'IncludeDeletedTest',
            email: 'include@example.com',
            age: 55,
            createdBy: testUserId1
        });

        await doc.softDelete(testUserId2);

        // Test find without includeDeleted
        const foundWithoutOption = await TestModel.findOne({ name: 'IncludeDeletedTest' });
        this.assert(foundWithoutOption === null, 'Should not find deleted document without includeDeleted option');

        // Test find with includeDeleted
        const foundWithOption = await TestModel.findOne(
            { name: 'IncludeDeletedTest' }
        ).setOptions({ includeDeleted: true });
        this.assert(foundWithOption !== null, 'Should find deleted document with includeDeleted option');
        this.assert(foundWithOption?.isDeleted === true, 'Found document should be marked as deleted');

        // Test count with includeDeleted
        const countWithoutOption = await TestModel.countDocuments({ name: 'IncludeDeletedTest' });
        const countWithOption = await TestModel.countDocuments(
            { name: 'IncludeDeletedTest' }
        ).setOptions({ includeDeleted: true });

        this.assert(countWithoutOption === 0, 'Count should be 0 without includeDeleted option');
        this.assert(countWithOption === 1, 'Count should be 1 with includeDeleted option');
    }
}

// Run the test suite
export async function runTests(): Promise<void> {
    const testSuite = new AuditTestSuite();
    await testSuite.runAllTests();
}

