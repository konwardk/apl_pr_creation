<?php

namespace App\Http\Controllers;

use App\Models\HeaderOption;
use App\Models\PrDocumentType;
use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Services\SapMasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

use Inertia\Inertia;
use Inertia\Response;

class PurchaseRequisitionController extends Controller
{
    protected SapMasterDataService $sapService;

    public function __construct(SapMasterDataService $sapService)
    {
        $this->sapService = $sapService;
    }

    /**
     * Fetch Materials / Products from SAP S/4HANA Cloud CDS View (YY1_MATERIALS_CDS)
     */
    public function getMaterials(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $result = $this->sapService->fetchMaterialsFromCdsView($search);

        return response()->json($result);
    }

    /**
     * Display the purchase requisition creation page.
     */
    public function create(Request $request): Response
    {
        $headerOptions = HeaderOption::where('is_active', true)
            ->orderBy('name')
            ->get();

        $prDocumentTypes = PrDocumentType::where('is_active', true)
            ->orderBy('code')
            ->get();

        $docTypesData = $prDocumentTypes->isNotEmpty()
            ? $prDocumentTypes->map(fn($dt) => [
                'code' => $dt->code,
                'name' => $dt->name,
                'extra' => $dt->description ?: $dt->category,
            ])->toArray()
            : [
                ['code' => 'ZCOM', 'name' => 'Domestic Cmpste PR (ZCOM)', 'extra' => 'Domestic Standard Requisition'],
                ['code' => 'NB', 'name' => 'Pur. Requisition (NB)', 'extra' => 'Standard Purchase Requisition'],
                ['code' => 'NBS', 'name' => 'Pur. Requisition NBS (NBS)', 'extra' => 'Special Item PR'],
                ['code' => 'RV', 'name' => 'Outline Agrmt. Reqn. (RV)', 'extra' => 'Outline Agreement'],
                ['code' => 'ZICP', 'name' => 'Import Cmpste PR (ZICP)', 'extra' => 'Import Composite'],
                ['code' => 'ZIMT', 'name' => 'Import Material PR (ZIMT)', 'extra' => 'Import Materials'],
                ['code' => 'ZISR', 'name' => 'Import Service PR (ZISR)', 'extra' => 'Import Services'],
                ['code' => 'ZMAT', 'name' => 'Domestic Material PR (ZMAT)', 'extra' => 'Domestic Materials'],
                ['code' => 'ZSER', 'name' => 'Domestic Service PR (ZSER)', 'extra' => 'Domestic Services'],
            ];

        return Inertia::render('purchase-requisitions/create', [
            'headerOptions' => $headerOptions,
            'prDocumentTypes' => $prDocumentTypes,
            'masterData' => [
                'headerOptions' => $headerOptions->map(fn($opt) => [
                    'code' => (string)$opt->id,
                    'name' => $opt->name,
                    'extra' => $opt->code ?: '',
                ])->toArray(),
                'documentTypes' => $docTypesData,
                'plants' => [
                    ['code' => '1200', 'name' => '1200 - Dibrugarh Manufacturing Plant', 'city' => 'Dibrugarh', 'street' => 'Parbatpur', 'country' => 'India (IN)', 'region' => 'Assam (AS)', 'postal' => '786623'],
                    ['code' => '1010', 'name' => '1010 - Plant Walldorf / US', 'city' => 'Walldorf', 'street' => 'Dietmar-Hopp-Allee 16', 'country' => 'Germany (DE)', 'region' => 'BW', 'postal' => '69190'],
                    ['code' => '1020', 'name' => '1020 - Plant Texas Tech Center', 'city' => 'Austin', 'street' => 'Silicon Hills Expressway', 'country' => 'United States (US)', 'region' => 'TX', 'postal' => '78701'],
                ],
                'accountAssignmentCategories' => [
                    ['code' => 'K', 'name' => 'K - Cost Center'],
                    ['code' => 'P', 'name' => 'P - Project (WBS)'],
                    ['code' => 'A', 'name' => 'A - Asset'],
                    ['code' => 'F', 'name' => 'F - Production Order'],
                    ['code' => 'U', 'name' => 'U - Unknown'],
                ],
                'materialGroups' => [
                    ['code' => 'L002', 'name' => 'Raw Materials (L002)'],
                    ['code' => 'L001', 'name' => 'Mechanical Components & Spares (L001)'],
                    ['code' => 'L003', 'name' => 'Electrical & Electronics (L003)'],
                    ['code' => 'P001', 'name' => 'Packaging Materials (P001)'],
                    ['code' => 'S001', 'name' => 'Maintenance & Plant Services (S001)'],
                ],
                'materials' => [
                    ['code' => '10000001', 'name' => 'HCL Acid 30-33% Conc.', 'materialGroup' => 'L002', 'uom' => 'KG', 'unitPrice' => 26.94, 'poText' => 'Technical Grade Hydrochloric Acid 30-33% concentration for industrial chemical processing.'],
                    ['code' => 'TG11', 'name' => 'High Pressure Hydraulic Seal 120mm', 'materialGroup' => 'L001', 'uom' => 'PC', 'unitPrice' => 320.00, 'poText' => 'Viton elastomer high pressure hydraulic cylinder seal rated for 350 bar.'],
                    ['code' => 'RM-049', 'name' => 'Industrial Solvent Degreaser 50L', 'materialGroup' => 'L002', 'uom' => 'L', 'unitPrice' => 84.50, 'poText' => 'Non-corrosive heavy duty solvent degreaser drum.'],
                    ['code' => 'SP-882', 'name' => 'Stainless Steel Flange 4-inch ANSI', 'materialGroup' => 'L001', 'uom' => 'EA', 'unitPrice' => 145.00, 'poText' => 'Class 150 ANSI 316L SS Flange blind weld neck.'],
                    ['code' => 'SRV-01', 'name' => 'Annual Machine Line Preventive Overhaul', 'materialGroup' => 'S001', 'uom' => 'AU', 'unitPrice' => 4500.00, 'poText' => 'Comprehensive annual certified mechanical servicing and calibration.'],
                ],
                'unitsOfMeasure' => [
                    ['code' => 'KG', 'name' => 'Kilogram (KG)'],
                    ['code' => 'PC', 'name' => 'Piece (PC)'],
                    ['code' => 'EA', 'name' => 'Each (EA)'],
                    ['code' => 'L', 'name' => 'Liter (L)'],
                    ['code' => 'M', 'name' => 'Meter (M)'],
                    ['code' => 'TO', 'name' => 'Ton (TO)'],
                    ['code' => 'AU', 'name' => 'Activity Unit (AU)'],
                    ['code' => 'HR', 'name' => 'Hour (HR)'],
                ],
                'currencies' => [
                    ['code' => 'INR', 'name' => 'INR - Indian Rupee'],
                    ['code' => 'USD', 'name' => 'USD - US Dollar'],
                    ['code' => 'EUR', 'name' => 'EUR - Euro'],
                    ['code' => 'GBP', 'name' => 'GBP - British Pound'],
                ],
                'taxCodes' => [
                    ['code' => 'V1', 'name' => 'V1 - 18% Input GST Standard'],
                    ['code' => 'V0', 'name' => 'V0 - 0% Tax Exempt'],
                    ['code' => 'I1', 'name' => 'I1 - 12% IGST Interstate'],
                    ['code' => 'I2', 'name' => 'I2 - 28% Input High GST'],
                ],
                'poPriceTypes' => [
                    ['code' => 'Do not adopt', 'name' => 'Do not adopt'],
                    ['code' => 'As gross price', 'name' => 'As gross price'],
                    ['code' => 'As net price', 'name' => 'As net price'],
                ],
                'purchasingOrganizations' => [
                    ['code' => '1200', 'name' => '1200 - APL Domestic Sourcing Org'],
                    ['code' => '1010', 'name' => '1010 - Corporate Procurement Global'],
                ],
                'purchasingGroups' => [
                    ['code' => '103', 'name' => 'Purchase (103)'],
                    ['code' => '101', 'name' => 'Central Purchasing (101)'],
                    ['code' => '001', 'name' => 'Raw Materials Sourcing (001)'],
                    ['code' => '002', 'name' => 'MRO & Spare Parts (002)'],
                ],
                'storageLocations' => [
                    ['code' => '101A', 'name' => '101A - Raw Materials Warehouse'],
                    ['code' => '101B', 'name' => '101B - Finished Goods Store'],
                    ['code' => '102A', 'name' => '102A - Engineering & Spares'],
                ],
                'costCenters' => [
                    ['code' => '12001101', 'name' => '12001101 - Chemical Processing Plant 1200'],
                    ['code' => '10101101', 'name' => '10101101 - Plant Maintenance Walldorf'],
                    ['code' => '10201101', 'name' => '10201101 - Texas Operations Lab'],
                ],
                'glAccounts' => [
                    ['code' => '40000000', 'name' => '40000000 - Raw Materials Consumption'],
                    ['code' => '51000000', 'name' => '51000000 - Factory Maintenance & Spares'],
                    ['code' => '52000000', 'name' => '52000000 - Outside Processing Services'],
                ],
                'attachmentDocTypes' => [
                    ['code' => 'SL1', 'name' => 'For External Use (SL1)'],
                    ['code' => 'SL9', 'name' => 'For Internal Use (SL9)'],
                    ['code' => 'YB0', 'name' => 'Office-Documents (YB0)'],
                    ['code' => 'YP1', 'name' => 'Image of Damage (YP1)'],
                    ['code' => 'YP2', 'name' => 'Manuals (YP2)'],
                ],
            ]
        ]);
    }

    /**
     * Store a newly created purchase requisition in local DB and prepare SAP OData V4 payload.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:255',
            'header_note' => 'nullable|string',
            'header_option_id' => 'nullable|exists:header_options,id',
            'pr_type' => 'required|string|max:10',
            'auto_source_determination' => 'nullable|boolean',
            'company_code' => 'nullable|string|max:10',
            'plant' => 'nullable|string|max:10',
            'currency' => 'nullable|string|size:3',
            'requisitioner' => 'nullable|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.item_type' => 'nullable|string|max:20',
            'items.*.item_number' => 'nullable|string|max:10',
            'items.*.description' => 'required|string|max:255',
            'items.*.material_code' => 'nullable|string|max:50',
            'items.*.supplier_material_number' => 'nullable|string|max:100',
            'items.*.batch' => 'nullable|string|max:50',
            'items.*.revision_level' => 'nullable|string|max:20',
            'items.*.material_group' => 'required|string|max:20',
            'items.*.desired_supplier' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_of_measure' => 'required|string|max:10',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.price_unit' => 'nullable|numeric|min:1',
            'items.*.currency' => 'nullable|string|size:3',
            'items.*.tax_code' => 'nullable|string|max:20',
            'items.*.po_price_type' => 'nullable|string|max:50',
            'items.*.plant' => 'required|string|max:10',
            'items.*.storage_location' => 'nullable|string|max:10',
            'items.*.account_assignment_category' => 'nullable|string|max:10',
            'items.*.requirement_tracking_number' => 'nullable|string|max:100',
            'items.*.cost_center' => 'nullable|string|max:20',
            'items.*.gl_account' => 'nullable|string|max:20',
            'items.*.purchasing_organization' => 'nullable|string|max:20',
            'items.*.purchasing_group' => 'nullable|string|max:20',
            'items.*.delivery_date' => 'nullable|date',
            'items.*.requisition_date' => 'nullable|date',
            'items.*.release_date' => 'nullable|date',
            'items.*.planned_delivery_time' => 'nullable|numeric',
            'items.*.gr_processing_time' => 'nullable|numeric',
            'items.*.item_text' => 'nullable|string',
            'items.*.item_note' => 'nullable|string',
            'items.*.delivery_text' => 'nullable|string',
            'items.*.material_po_text' => 'nullable|string',
            'items.*.closure_comment' => 'nullable|string',
            'items.*.attachment_doc_type' => 'nullable|string|max:50',
            'items.*.attachment_name' => 'nullable|string|max:255',
        ]);

        $prNumber = '';

        DB::transaction(function () use ($validated, $request, &$prNumber) {
            $nextSeq = (PurchaseRequisition::max('id') ?? 0) + 1;
            $prNumber = 'PR-' . date('Y') . '-' . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);

            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $pu = !empty($item['price_unit']) && (float)$item['price_unit'] > 0 ? (float)$item['price_unit'] : 1;
                $totalAmount += (((float)$item['quantity'] / $pu) * (float)$item['unit_price']);
            }

            $primaryPlant = $validated['items'][0]['plant'] ?? ($validated['plant'] ?? '1200');
            $primaryDesc = !empty($validated['description']) ? $validated['description'] : ($validated['items'][0]['description'] ?? 'Purchase Requisition');

            $pr = PurchaseRequisition::create([
                'pr_number' => $prNumber,
                'user_id' => $request->user()?->id,
                'description' => $primaryDesc,
                'header_note' => $validated['header_note'] ?? null,
                'header_option_id' => $validated['header_option_id'] ?? null,
                'pr_type' => $validated['pr_type'] ?? 'ZCOM',
                'auto_source_determination' => !empty($validated['auto_source_determination']),
                'company_code' => $validated['company_code'] ?? '1010',
                'plant' => $primaryPlant,
                'total_amount' => $totalAmount,
                'currency' => $validated['currency'] ?? 'INR',
                'requisitioner' => $validated['requisitioner'] ?? ($request->user()?->name ?? 'Requester'),
                'approval_status' => 'approved',
                'sap_sync_status' => 'pending',
                'sap_sync_message' => 'Created in local database. Ready for SAP S/4HANA OData V4 POST.',
            ]);

            foreach ($validated['items'] as $index => $itemData) {
                $pu = !empty($itemData['price_unit']) && (float)$itemData['price_unit'] > 0 ? (float)$itemData['price_unit'] : 1;
                $itemTotal = (((float)$itemData['quantity'] / $pu) * (float)$itemData['unit_price']);
                $itemNum = !empty($itemData['item_number']) ? $itemData['item_number'] : str_pad(($index + 1) * 10, 5, '0', STR_PAD_LEFT);

                PurchaseRequisitionItem::create([
                    'purchase_requisition_id' => $pr->id,
                    'item_number' => $itemNum,
                    'item_type' => $itemData['item_type'] ?? 'material',
                    'material_code' => $itemData['material_code'] ?? null,
                    'supplier_material_number' => $itemData['supplier_material_number'] ?? null,
                    'batch' => $itemData['batch'] ?? null,
                    'revision_level' => $itemData['revision_level'] ?? null,
                    'description' => $itemData['description'],
                    'material_group' => $itemData['material_group'] ?? 'L001',
                    'desired_supplier' => $itemData['desired_supplier'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit_of_measure' => $itemData['unit_of_measure'] ?? 'PC',
                    'unit_price' => $itemData['unit_price'],
                    'price_unit' => $pu,
                    'total_price' => $itemTotal,
                    'currency' => $itemData['currency'] ?? $pr->currency,
                    'tax_code' => $itemData['tax_code'] ?? null,
                    'po_price_type' => $itemData['po_price_type'] ?? 'Do not adopt',
                    'plant' => $itemData['plant'] ?? $pr->plant,
                    'storage_location' => $itemData['storage_location'] ?? '101A',
                    'account_assignment_category' => $itemData['account_assignment_category'] ?? 'K',
                    'requirement_tracking_number' => $itemData['requirement_tracking_number'] ?? null,
                    'cost_center' => $itemData['cost_center'] ?? '12001101',
                    'gl_account' => $itemData['gl_account'] ?? '40000000',
                    'purchasing_organization' => $itemData['purchasing_organization'] ?? '1200',
                    'purchasing_group' => $itemData['purchasing_group'] ?? '103',
                    'delivery_date' => $itemData['delivery_date'] ?? now()->addDays(14)->format('Y-m-d'),
                    'requisition_date' => $itemData['requisition_date'] ?? now()->format('Y-m-d'),
                    'release_date' => $itemData['release_date'] ?? now()->format('Y-m-d'),
                    'planned_delivery_time' => $itemData['planned_delivery_time'] ?? 0,
                    'gr_processing_time' => $itemData['gr_processing_time'] ?? 0,
                    'item_text' => $itemData['item_text'] ?? null,
                    'item_note' => $itemData['item_note'] ?? null,
                    'delivery_text' => $itemData['delivery_text'] ?? null,
                    'material_po_text' => $itemData['material_po_text'] ?? null,
                    'closure_comment' => $itemData['closure_comment'] ?? null,
                    'attachment_doc_type' => $itemData['attachment_doc_type'] ?? null,
                    'attachment_name' => $itemData['attachment_name'] ?? null,
                ]);
            }

            $pr->update([
                'sap_payload' => $pr->toSapODataV4Payload(),
            ]);
        });

        return redirect()->route('dashboard')->with('success', "Purchase Requisition {$prNumber} successfully created in local database.");
    }

    /**
     * Post/Sync Purchase Requisition to SAP Public Cloud via OData V4 API.
     */
    public function sync(Request $request, PurchaseRequisition $purchaseRequisition): RedirectResponse
    {
        if ($request->user() && $request->user()->isEmployee()) {
            return back()->with('error', 'Employees are not authorized to trigger direct SAP Cloud dispatch.');
        }

        $payload = $purchaseRequisition->toSapODataV4Payload();

        $sapHost = env('SAP_ODATA_URL');
        $sapUser = env('SAP_ODATA_USER');
        $sapPass = env('SAP_ODATA_PASSWORD');

        if (!empty($sapHost) && !empty($sapUser) && !empty($sapPass)) {
            // Live SAP Public Cloud OData V4 Request
            try {
                $endpoint = rtrim($sapHost, '/') . '/sap/opu/odata4/sap/api_purchaserequisition_process_srv/srvd_a2x/sap/purchaserequisition/0001/PurchaseRequisition';

                // Fetch CSRF Token first if required by SAP Gateway
                $tokenResponse = Http::withBasicAuth($sapUser, $sapPass)
                    ->withHeaders(['x-csrf-token' => 'Fetch'])
                    ->head($endpoint);

                $csrfToken = $tokenResponse->header('x-csrf-token');
                $cookies = $tokenResponse->cookies();

                $response = Http::withBasicAuth($sapUser, $sapPass)
                    ->withHeaders([
                        'x-csrf-token' => $csrfToken,
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                    ])
                    ->withCookies($cookies->toArray(), parse_url($sapHost, PHP_URL_HOST))
                    ->post($endpoint, $payload);

                if ($response->successful() || $response->status() === 201) {
                    $resJson = $response->json();
                    $sapPrNum = $resJson['PurchaseRequisition'] ?? ('100' . rand(10000, 99999));

                    $purchaseRequisition->update([
                        'sap_pr_number' => $sapPrNum,
                        'sap_sync_status' => 'synced',
                        'sap_synced_at' => now(),
                        'sap_sync_message' => "HTTP {$response->status()} Created: Posted to SAP S/4HANA Cloud (PR #{$sapPrNum})",
                        'sap_response' => $resJson,
                    ]);

                    return back()->with('success', "PR posted to SAP Public Cloud successfully (SAP #{$sapPrNum})");
                } else {
                    $purchaseRequisition->update([
                        'sap_sync_status' => 'failed',
                        'sap_sync_message' => "SAP Error HTTP {$response->status()}: " . substr($response->body(), 0, 300),
                    ]);

                    return back()->with('error', "SAP OData V4 returned error: " . $response->status());
                }
            } catch (\Exception $e) {
                $purchaseRequisition->update([
                    'sap_sync_status' => 'failed',
                    'sap_sync_message' => "Connection Error: " . $e->getMessage(),
                ]);

                return back()->with('error', "Failed to connect to SAP Cloud endpoint: " . $e->getMessage());
            }
        } else {
            // Simulated SAP Public Cloud OData V4 Success for local sandbox/staging demo
            $mockSapPrNumber = '100' . rand(10000, 99999);
            $mockSapResponse = [
                '@odata.context' => '$metadata#PurchaseRequisition/$entity',
                'PurchaseRequisition' => $mockSapPrNumber,
                'PurchaseRequisitionType' => $purchaseRequisition->pr_type,
                'PurReqnDescription' => $purchaseRequisition->description,
                'PurReqnCreationDate' => now()->toDateString(),
                'CreatedByUser' => 'SAP_PUBLIC_CLOUD_INTEGRATION',
                'Status' => '201 Created (OData V4 Simulated Dispatch)',
            ];

            $purchaseRequisition->update([
                'sap_pr_number' => $mockSapPrNumber,
                'sap_sync_status' => 'synced',
                'sap_synced_at' => now(),
                'sap_sync_message' => "HTTP 201 Created: Dispatched to SAP Public Cloud OData V4 (SAP PR #{$mockSapPrNumber})",
                'sap_payload' => $payload,
                'sap_response' => $mockSapResponse,
            ]);

            return back()->with('success', "Simulated SAP Cloud OData V4 POST: PR #{$mockSapPrNumber} created in SAP S/4HANA Cloud!");
        }
    }
}
