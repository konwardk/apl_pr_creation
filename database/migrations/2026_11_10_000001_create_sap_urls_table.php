<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sap_urls', function (Blueprint $table) {
            $table->id();
            $table->string('environment_name', 100)->comment('Environment name (e.g. Quality / Test, Development, Production)');
            $table->string('url', 255)->comment('SAP S/4HANA Cloud Base / Tenant URL');
            $table->text('description')->nullable()->comment('Notes and details regarding this SAP tenant/endpoint');
            $table->boolean('is_active')->default(false)->index()->comment('Whether this URL is currently active and in use across all modules');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Seed initial Quality/Test URL as active, and Development URL as inactive
        DB::table('sap_urls')->insert([
            [
                'environment_name' => 'Quality / Test',
                'url' => 'https://my443658.s4hana.cloud.sap/',
                'description' => 'SAP S/4HANA Cloud Quality / Test Environment',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'environment_name' => 'Development',
                'url' => 'https://my443544-api.s4hana.cloud.sap',
                'description' => 'SAP S/4HANA Cloud Development Environment (Legacy Dev)',
                'is_active' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sap_urls');
    }
};
