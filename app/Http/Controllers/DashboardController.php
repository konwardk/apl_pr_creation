<?php

namespace App\Http\Controllers;

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
        $prs = PurchaseRequisition::with(['items', 'user'])
            ->latest()
            ->get();

        $stats = [
            'total_count' => $prs->count(),
            'total_amount' => $prs->sum('total_amount'),
            'synced_count' => $prs->where('sap_sync_status', 'synced')->count(),
            'pending_sync_count' => $prs->where('sap_sync_status', 'pending')->count(),
            'failed_sync_count' => $prs->where('sap_sync_status', 'failed')->count(),
            'in_approval_count' => $prs->where('approval_status', 'in_approval')->count(),
            'approved_count' => $prs->where('approval_status', 'approved')->count(),
        ];

        $sapConfig = [
            'system_name' => 'SAP S/4HANA Cloud (Public Edition)',
            'edition' => '2408.3 Enterprise Cloud',
            'api_service' => 'API_PURCHASEREQUISITION_PROCESS_SRV',
            'odata_version' => 'OData V4 (JSON format)',
            'entity_set' => 'PurchaseRequisition',
            'status' => 'Configured & Active',
            'tenant_url' => env('SAP_ODATA_URL', 'https://my300123-api.s4hana.cloud.sap'),
            'communication_scenario' => 'SAP_COM_0053 (Purchase Requisition Integration)',
        ];

        return Inertia::render('dashboard', [
            'purchaseRequisitions' => $prs,
            'stats' => $stats,
            'sapConfig' => $sapConfig,
        ]);
    }
}
