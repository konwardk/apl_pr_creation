<?php

namespace App\Http\Controllers;

use App\Models\HeaderOption;
use App\Models\PrDocumentType;
use App\Models\PurchaseRequisition;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the SAP Fiori Launchpad style PR Dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = PurchaseRequisition::with(['items', 'user', 'headerOption'])->latest();

        // If employee, only show their own created PRs
        if ($user && $user->isEmployee()) {
            $query->where('user_id', $user->id);
        }

        $prs = $query->get();

        $stats = [
            'total_count' => $prs->count(),
            'total_amount' => $prs->sum('total_amount'),
            'synced_count' => $prs->where('sap_sync_status', 'synced')->count(),
            'pending_sync_count' => $prs->where('sap_sync_status', 'pending')->count(),
            'failed_sync_count' => $prs->where('sap_sync_status', 'failed')->count(),
            'in_approval_count' => $prs->where('approval_status', 'in_approval')->count(),
            'approved_count' => $prs->where('approval_status', 'approved')->count(),
        ];

        $headerOptions = HeaderOption::with('creator:id,name,email')
            ->orderBy('is_active', 'desc')
            ->orderBy('name')
            ->get();

        $prDocumentTypes = PrDocumentType::with('creator:id,name,email')
            ->orderBy('code')
            ->get();

        $tenantUrl = config('sap.tenant_url', env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap'));
        $serviceRoot = config('sap.endpoints.service_root', rtrim($tenantUrl, '/') . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/');

        $sapConfig = [
            'system_name' => config('sap.system_name', 'SAP S/4HANA Cloud (Public Edition)'),
            'edition' => config('sap.edition', '2408.3 Enterprise Cloud'),
            'api_service' => 'api_purchaserequisition_2',
            'odata_version' => 'OData V4 (JSON format)',
            'entity_set' => 'PurchaseReqn',
            'status' => 'Configured & Active',
            'tenant_url' => $tenantUrl,
            'endpoint_url' => $serviceRoot,
            'communication_scenario' => 'SAP_COM_0053 (Purchase Requisition Integration)',
        ];

        return Inertia::render('dashboard', [
            'purchaseRequisitions' => $prs,
            'stats' => $stats,
            'headerOptions' => $headerOptions,
            'prDocumentTypes' => $prDocumentTypes,
            'sapConfig' => $sapConfig,
        ]);
    }
}
