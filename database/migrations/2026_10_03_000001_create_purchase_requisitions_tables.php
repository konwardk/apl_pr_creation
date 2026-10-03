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
        Schema::create('purchase_requisitions', function (Blueprint $table) {
            $table->id();
            $table->string('pr_number', 50)->unique();
            $table->string('sap_pr_number', 50)->nullable()->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description', 255);
            $table->string('pr_type', 10)->default('NB'); // NB: Standard PR
            $table->string('company_code', 10)->default('1010');
            $table->string('plant', 10)->default('1010');
            $table->decimal('total_amount', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->enum('approval_status', ['draft', 'in_approval', 'approved', 'rejected'])->default('draft');
            $table->enum('sap_sync_status', ['pending', 'synced', 'failed'])->default('pending');
            $table->text('sap_sync_message')->nullable();
            $table->timestamp('sap_synced_at')->nullable();
            $table->json('sap_payload')->nullable();
            $table->json('sap_response')->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_requisition_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_requisition_id')->constrained()->cascadeOnDelete();
            $table->string('item_number', 10)->default('00010');
            $table->string('material_code', 50)->nullable();
            $table->string('description', 255);
            $table->string('material_group', 20)->default('L001');
            $table->decimal('quantity', 13, 3)->default(1.000);
            $table->string('unit_of_measure', 10)->default('PC');
            $table->decimal('unit_price', 15, 2)->default(0.00);
            $table->decimal('total_price', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->string('plant', 10)->default('1010');
            $table->string('storage_location', 10)->nullable()->default('101A');
            $table->string('account_assignment_category', 5)->default('K'); // K: Cost Center
            $table->string('cost_center', 20)->nullable()->default('10101101');
            $table->string('gl_account', 20)->nullable()->default('51000000');
            $table->date('delivery_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_requisition_items');
        Schema::dropIfExists('purchase_requisitions');
    }
};
