<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_requisition_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_requisition_id')->nullable()->constrained('purchase_requisitions')->cascadeOnDelete();
            $table->string('pr_number', 50)->index();
            $table->string('sap_pr_number', 50)->nullable()->index();
            $table->string('pr_type', 50)->default('normal'); // 'normal' or 'emergent'
            $table->string('name', 100)->nullable(); // 'Normal' or 'Emergent'
            $table->text('description')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_draft')->default(false);
            $table->string('sap_sync_status', 50)->default('pending');
            $table->timestamps();
        });

        if (!Schema::hasColumn('purchase_requisitions', 'requisition_type')) {
            Schema::table('purchase_requisitions', function (Blueprint $table) {
                $table->string('requisition_type', 50)->default('normal')->after('pr_type');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_requisition_types');

        if (Schema::hasColumn('purchase_requisitions', 'requisition_type')) {
            Schema::table('purchase_requisitions', function (Blueprint $table) {
                $table->dropColumn('requisition_type');
            });
        }
    }
};
