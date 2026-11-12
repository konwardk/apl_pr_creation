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
        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->decimal('expected_value', 15, 2)->nullable()->after('total_price');
            $table->decimal('overall_limit', 15, 2)->nullable()->after('expected_value');
            $table->date('start_date')->nullable()->after('release_date');
            $table->date('end_date')->nullable()->after('start_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->dropColumn([
                'expected_value',
                'overall_limit',
                'start_date',
                'end_date',
            ]);
        });
    }
};
