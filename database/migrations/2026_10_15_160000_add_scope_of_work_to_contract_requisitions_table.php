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
        Schema::table('contract_requisitions', function (Blueprint $table) {
            if (!Schema::hasColumn('contract_requisitions', 'scope_of_work')) {
                $table->string('scope_of_work', 500)->nullable()->after('contract_title');
            }
            if (Schema::hasColumn('contract_requisitions', 'payment_terms')) {
                $table->string('payment_terms', 500)->nullable()->change();
            }
            if (Schema::hasColumn('contract_requisitions', 'defect_liability_period')) {
                $table->string('defect_liability_period', 50)->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contract_requisitions', function (Blueprint $table) {
            if (Schema::hasColumn('contract_requisitions', 'scope_of_work')) {
                $table->dropColumn('scope_of_work');
            }
            if (Schema::hasColumn('contract_requisitions', 'payment_terms')) {
                $table->string('payment_terms', 50)->nullable()->change();
            }
            if (Schema::hasColumn('contract_requisitions', 'defect_liability_period')) {
                $table->string('defect_liability_period', 500)->nullable()->change();
            }
        });
    }
};
