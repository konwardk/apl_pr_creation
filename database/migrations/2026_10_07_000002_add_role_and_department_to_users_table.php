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
            $table->foreignId('role_id')->nullable()->after('email')->constrained('roles')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->after('role_id')->constrained('departments')->nullOnDelete();
            $table->string('employee_id')->nullable()->unique()->after('department_id');
            $table->string('designation')->nullable()->after('employee_id');
            $table->string('phone')->nullable()->after('designation');
            $table->string('plant')->nullable()->default('1200 - Dibrugarh Manufacturing Plant')->after('phone');
            $table->boolean('is_active')->default(true)->after('plant');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['department_id']);
            $table->dropColumn([
                'role_id',
                'department_id',
                'employee_id',
                'designation',
                'phone',
                'plant',
                'is_active',
            ]);
        });
    }
};
