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
        Schema::create('purchasing_groups', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique()->comment('SAP Purchasing Group Code (EKGRP, e.g. 103, 001, 101, 102)');
            $table->string('name', 255)->comment('Purchasing Group Name or Buyer Team (e.g. Operational Plant Purchasing Team)');
            $table->text('description')->nullable()->comment('Detailed operational usage, commodities, or buyer responsibilities');
            $table->string('email', 255)->nullable()->comment('Buyer team email address');
            $table->string('phone_number', 50)->nullable()->comment('Buyer team contact phone or extension');
            $table->boolean('is_active')->default(true)->index()->comment('Whether this purchasing group is enabled for PR requisitions');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchasing_groups');
    }
};
