<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);
        $this->configureDefaults();

        // Dynamically align SAP config with the active URL stored in database
        try {
            if (Schema::hasTable('sap_urls')) {
                $activeRecord = \App\Models\SapUrl::getActiveRecord();
                if ($activeRecord) {
                    $activeUrl = rtrim(trim($activeRecord->url), '/');
                    config(['sap.tenant_url' => $activeUrl]);

                    // Sync credentials based on active environment
                    if (!empty($activeRecord->username) && !empty($activeRecord->password)) {
                        config([
                            'sap.auth.username' => $activeRecord->username,
                            'sap.auth.password' => $activeRecord->password,
                        ]);
                    } elseif (str_contains($activeUrl, 'my443658') || stripos($activeRecord->environment_name, 'quality') !== false || stripos($activeRecord->environment_name, 'test') !== false) {
                        config([
                            'sap.auth.username' => env('SAP_TEST_ODATA_USER', env('SAP_ODATA_USER', 'Communication_user')),
                            'sap.auth.password' => env('SAP_TEST_ODATA_PASSWORD', env('SAP_ODATA_PASSWORD', 'Communication@1123456789')),
                        ]);
                    } elseif (str_contains($activeUrl, 'my443544') || stripos($activeRecord->environment_name, 'dev') !== false) {
                        config([
                            'sap.auth.username' => env('SAP_DEV_ODATA_USER', 'BTP_S4_INTEGRATION'),
                            'sap.auth.password' => env('SAP_DEV_ODATA_PASSWORD', 'Assampetrochemical@123#'),
                        ]);
                    }

                    $endpoints = config('sap.endpoints', []);
                    foreach ($endpoints as $key => $endpoint) {
                        $parts = parse_url($endpoint);
                        $path = ($parts['path'] ?? '') . (isset($parts['query']) ? '?' . $parts['query'] : '');
                        $endpoints[$key] = $activeUrl . '/' . ltrim($path, '/');
                    }
                    config(['sap.endpoints' => $endpoints]);
                }
            }
        } catch (\Throwable $e) {
            // Fall back silently if DB is unreachable or during initial migration
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
