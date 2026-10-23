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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'purchasing_group')) {
                $table->string('purchasing_group', 20)
                    ->nullable()
                    ->after('plant')
                    ->index()
                    ->comment('Assigned SAP Purchasing Group (EKGRP, e.g. 103, 101)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'purchasing_group')) {
                $table->dropColumn('purchasing_group');
            }
        });
    }
};
