<?php

namespace App\Http\Controllers;

use App\Models\SapUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class SapUrlController extends Controller
{
    /**
     * Display a listing of SAP environment URLs.
     */
    public function index(Request $request): Response
    {
        $query = SapUrl::with(['creator:id,name,email', 'updater:id,name,email'])
            ->orderBy('is_active', 'desc')
            ->orderBy('updated_at', 'desc');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('environment_name', 'like', "%{$search}%")
                    ->orWhere('url', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sapUrls = $query->get();
        $allUrls = SapUrl::all();
        $activeUrl = $allUrls->where('is_active', true)->first();

        $stats = [
            'total_urls' => $allUrls->count(),
            'active_url' => $activeUrl?->url ?? config('sap.tenant_url'),
            'active_environment' => $activeUrl?->environment_name ?? 'Default (Config)',
            'inactive_count' => $allUrls->where('is_active', false)->count(),
        ];

        return Inertia::render('change-url/index', [
            'sapUrls' => $sapUrls,
            'activeRecord' => $activeUrl,
            'stats' => $stats,
            'filters' => [
                'search' => $request->query('search', ''),
            ],
        ]);
    }

    /**
     * Store a newly created SAP URL in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'environment_name' => ['required', 'string', 'max:100'],
            'url' => ['required', 'string', 'max:255', 'url'],
            'username' => ['nullable', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $isActive = $request->boolean('is_active');

        // If this is the very first URL being created, force it to be active
        if (SapUrl::count() === 0) {
            $isActive = true;
        }

        $envName = trim($validated['environment_name']);
        $urlStr = trim($validated['url']);
        $username = !empty($validated['username']) ? trim($validated['username']) : null;
        $password = !empty($validated['password']) ? trim($validated['password']) : null;

        if (!$username || !$password) {
            if (str_contains($urlStr, 'my443658') || stripos($envName, 'quality') !== false || stripos($envName, 'test') !== false) {
                $username = $username ?: env('SAP_TEST_ODATA_USER', 'Communication_user');
                $password = $password ?: env('SAP_TEST_ODATA_PASSWORD', 'Communication@1123456789');
            } elseif (str_contains($urlStr, 'my443544') || stripos($envName, 'dev') !== false) {
                $username = $username ?: env('SAP_DEV_ODATA_USER', 'BTP_S4_INTEGRATION');
                $password = $password ?: env('SAP_DEV_ODATA_PASSWORD', 'Assampetrochemical@123#');
            }
        }

        $url = SapUrl::create([
            'environment_name' => $envName,
            'url' => $urlStr,
            'username' => $username,
            'password' => $password,
            'description' => $validated['description'] ?? null,
            'is_active' => $isActive,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        $msg = "SAP URL for '{$url->environment_name}' created successfully.";
        if ($isActive) {
            $msg .= " It is now set as the active URL across all modules.";
        }

        return redirect()->route('change-url.index')->with('success', $msg);
    }

    /**
     * Update the specified SAP URL.
     */
    public function update(Request $request, SapUrl $sapUrl): RedirectResponse
    {
        $validated = $request->validate([
            'environment_name' => ['required', 'string', 'max:100'],
            'url' => ['required', 'string', 'max:255', 'url'],
            'username' => ['nullable', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $willBeActive = $request->boolean('is_active');

        // Prevent deactivating the only active URL without activating another
        if ($sapUrl->is_active && !$willBeActive) {
            $otherActive = SapUrl::where('id', '!=', $sapUrl->id)->where('is_active', true)->exists();
            if (!$otherActive) {
                return redirect()->back()->with('error', 'At least one SAP URL must remain active. To change the active URL, activate a different environment instead.');
            }
        }

        $updateData = [
            'environment_name' => trim($validated['environment_name']),
            'url' => trim($validated['url']),
            'description' => $validated['description'] ?? null,
            'is_active' => $willBeActive,
            'updated_by' => $request->user()?->id,
        ];

        if ($request->has('username')) {
            $updateData['username'] = trim($request->input('username'));
        }

        if ($request->filled('password')) {
            $updateData['password'] = trim($request->input('password'));
        }

        $sapUrl->update($updateData);

        $msg = "SAP URL '{$sapUrl->environment_name}' updated successfully.";
        if ($willBeActive) {
            $msg .= " It is now active across all application modules.";
        }

        return redirect()->route('change-url.index')->with('success', $msg);
    }

    /**
     * Remove the specified SAP URL from storage.
     */
    public function destroy(SapUrl $sapUrl): RedirectResponse
    {
        if ($sapUrl->is_active) {
            return redirect()->back()->with('error', 'The active SAP URL cannot be deleted. Please activate another URL before deleting this record.');
        }

        $name = $sapUrl->environment_name;
        $sapUrl->delete();

        return redirect()->route('change-url.index')->with('success', "SAP URL '{$name}' deleted successfully.");
    }

    /**
     * Activate the specified SAP URL and deactivate all others.
     */
    public function activate(SapUrl $sapUrl): RedirectResponse
    {
        $sapUrl->activate();

        return redirect()->route('change-url.index')->with(
            'success',
            "Active SAP S/4HANA Cloud URL switched to '{$sapUrl->environment_name}' ({$sapUrl->url}). All application modules and endpoints are now working with this URL."
        );
    }

    /**
     * Test HTTP connectivity to an SAP URL.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $request->validate([
            'url' => ['required', 'url'],
            'username' => ['nullable', 'string'],
            'password' => ['nullable', 'string'],
        ]);

        $targetUrl = rtrim(trim($request->input('url')), '/');
        $sapUrlRecord = SapUrl::where('url', $targetUrl)->orWhere('url', $targetUrl . '/')->first();

        $username = $request->input('username') ?: ($sapUrlRecord?->username);
        $password = $request->input('password') ?: ($sapUrlRecord?->password);

        if (!$username || !$password) {
            $sapService = app(\App\Services\SapMasterDataService::class);
            [$username, $password] = $sapService->getAuthCredentials($username, $password);
        }

        $startTime = microtime(true);

        try {
            $verifySsl = config('sap.verify_ssl', false);
            $req = Http::timeout(8)
                ->withHeaders(['Accept' => 'application/json'])
                ->when(!$verifySsl, fn ($http) => $http->withoutVerifying());

            if (!empty($username) && !empty($password)) {
                $req = $req->withBasicAuth($username, $password);
            }

            $response = $req->get($targetUrl);

            $durationMs = round((microtime(true) - $startTime) * 1000);

            return response()->json([
                'success' => true,
                'status' => $response->status(),
                'latency_ms' => $durationMs,
                'url' => $targetUrl,
                'username' => $username,
                'message' => "Reached SAP Host with HTTP status {$response->status()} in {$durationMs}ms.",
            ]);
        } catch (\Exception $e) {
            $durationMs = round((microtime(true) - $startTime) * 1000);

            return response()->json([
                'success' => false,
                'status' => 0,
                'latency_ms' => $durationMs,
                'url' => $targetUrl,
                'message' => "Connection test failed: " . $e->getMessage(),
            ], 500);
        }
    }
}
