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
        Schema::table('sap_urls', function (Blueprint $table) {
            $table->string('username', 100)->nullable()->after('url')->comment('SAP Communication User for this environment');
            $table->string('password', 255)->nullable()->after('username')->comment('SAP Communication Password for this environment');
        });

        // Populate credentials for existing Quality/Test and Development URLs
        DB::table('sap_urls')
            ->where('environment_name', 'Quality / Test')
            ->orWhere('url', 'like', '%my443658%')
            ->update([
                'username' => 'Communication_user',
                'password' => 'Communication@1123456789',
            ]);

        DB::table('sap_urls')
            ->where('environment_name', 'Development')
            ->orWhere('url', 'like', '%my443544%')
            ->update([
                'username' => 'BTP_S4_INTEGRATION',
                'password' => 'Assampetrochemical@123#',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sap_urls', function (Blueprint $table) {
            $table->dropColumn(['username', 'password']);
        });
    }
};
