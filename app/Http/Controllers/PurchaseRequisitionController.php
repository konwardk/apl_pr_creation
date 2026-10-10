<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\HeaderOption;
use App\Models\PrDocumentType;
use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Models\User;
use App\Services\SapMasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
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
        $material = $request->query('material') ?? $request->query('material_code') ?? $request->query('product') ?? $request->query('Product');
        $valuationArea = $request->query('valuationArea') ?? $request->query('valuation_area') ?? $request->query('plant') ?? $request->query('Plant');

        $result = $this->sapService->fetchMaterialsFromCdsView($search, $material, $valuationArea);

        return response()->json($result);
    }

    /**
     * Fetch Account Assignment Categories from SAP S/4HANA Cloud CDS View (YY1_ACCOUNTASSIGNMENTCAT_CDS)
     */
    public function getAccountAssignmentCategories(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $result = $this->sapService->fetchAccountAssignmentCategoriesFromCdsView($search);

        return response()->json($result);
    }

    /**
     * Fetch Plants from SAP S/4HANA Cloud Value Help Service (ZUI_TMS_DESPATCH_04 / PlantVH)
     */
    public function getPlants(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $result = $this->sapService->fetchPlantsFromSap($search);

        return response()->json($result);
    }

    /**
     * Display the purchase requisition creation page.
     */
    public function create(Request $request): Response
    {
        // 1. Header options from internal database (apl_pr_db)
        $headerOptions = HeaderOption::where('is_active', true)
            ->orderBy('name')
            ->get();

        // 2. PR document types from internal database (synced from SAP CDS view YY1_PURCHASEREQTYPE_CDS)
        $prDocumentTypes = PrDocumentType::where('is_active', true)
            ->orderBy('code')
            ->get();

        // If not yet present in DB, attempt to sync live from SAP S/4HANA Cloud CDS View
        if ($prDocumentTypes->isEmpty()) {
            $sapDocTypes = $this->sapService->fetchPrDocumentTypesFromCdsView();
            if (!empty($sapDocTypes['items']) && ($sapDocTypes['is_live'] ?? false)) {
                $this->sapService->savePrDocumentTypes($sapDocTypes['items'], $request->user()?->id);
                $prDocumentTypes = PrDocumentType::where('is_active', true)
                    ->orderBy('code')
                    ->get();
            }
        }

        $docTypesData = $prDocumentTypes->map(fn($dt) => [
            'code' => $dt->code,
            'name' => $dt->name,
            'extra' => $dt->description ?: $dt->category,
        ])->toArray();

        // 3. Account Assignment Categories from live SAP CDS view YY1_ACCOUNTASSIGNMENTCAT_CDS
        $acctResult = $this->sapService->fetchAccountAssignmentCategoriesFromCdsView();
        $accountAssignmentCategories = ($acctResult['success'] ?? false && !empty($acctResult['items']))
            ? array_map(fn($item) => [
                'code' => $item['code'],
                'name' => $item['name'],
                'extra' => $item['extra'] ?? '',
            ], $acctResult['items'])
            : $this->sapService->getFormattedFallbackAccountAssignmentCategories();

        // 4. Materials from live SAP CDS view YY1_MATERIALS_CDS
        $materialsResult = $this->sapService->fetchMaterialsFromCdsView();
        $materials = ($materialsResult['success'] ?? false)
            ? array_map(fn($item) => [
                'code' => $item['code'],
                'name' => $item['name'],
                'materialGroup' => $item['materialGroup'] ?? '',
                'materialType' => $item['materialType'] ?? '',
                'uom' => $item['uom'] ?? 'PC',
                'unitPrice' => (float)($item['unitPrice'] ?? 0),
                'valuationPrice' => (float)($item['valuationPrice'] ?? $item['unitPrice'] ?? 0),
                'poText' => $item['poText'] ?? '',
                'extra' => trim(($item['materialGroup'] ?? '') . ' • ' . ($item['uom'] ?? '')),
                'Product' => $item['Product'] ?? $item['code'],
                'ProductName' => $item['ProductName'] ?? $item['name'],
                'ProductExternalID' => $item['ProductExternalID'] ?? $item['code'],
                'WeightUnit' => $item['WeightUnit'] ?? '',
                'UnitOfMeasure' => $item['UnitOfMeasure'] ?? $item['uom'] ?? 'PC',
                'ProductGroup' => $item['ProductGroup'] ?? $item['materialGroup'] ?? '',
                'ProductType' => $item['ProductType'] ?? $item['materialType'] ?? '',
                'MovingAveragePrice' => $item['MovingAveragePrice'] ?? '0.00',
                'StandardPrice' => $item['StandardPrice'] ?? '0.00',
                'InventoryValuationProcedure' => $item['InventoryValuationProcedure'] ?? '',
                'priceControl' => $item['priceControl'] ?? $item['InventoryValuationProcedure'] ?? '',
                'Currency' => $item['Currency'] ?? '',
                'ValuationArea' => $item['ValuationArea'] ?? '',
                'raw_data' => $item['raw_data'] ?? [],
            ], $materialsResult['items'] ?? [])
            : [];

        // 5. Extract real Material Groups dynamically from SAP master materials
        $materialGroups = collect($materials)
            ->pluck('materialGroup')
            ->filter()
            ->unique()
            ->values()
            ->map(fn($group) => [
                'code' => $group,
                'name' => "Material Group {$group}",
                'extra' => 'SAP Material Group',
            ])->toArray();

        // 6. Extract real Units of Measure dynamically from SAP master materials
        $unitsOfMeasure = collect($materials)
            ->pluck('uom')
            ->filter()
            ->unique()
            ->values()
            ->map(fn($uom) => [
                'code' => $uom,
                'name' => $uom,
                'extra' => 'SAP Unit of Measure',
            ])->toArray();

        // 7. Extract real Material Types dynamically from SAP master materials
        $materialTypes = collect($materials)
            ->pluck('materialType')
            ->filter()
            ->unique()
            ->values()
            ->map(fn($mtype) => [
                'code' => $mtype,
                'name' => $mtype,
                'extra' => 'SAP Material Type',
            ])->toArray();

        // 8. Plants from live SAP S/4HANA Cloud service (ZUI_TMS_DESPATCH_04 / PlantVH)
        $plantsResult = $this->sapService->fetchPlantsFromSap();
        $plants = ($plantsResult['success'] ?? false && !empty($plantsResult['items']))
            ? array_map(fn($item) => [
                'code' => $item['code'],
                'name' => $item['name'],
                'plantName' => $item['plantName'] ?? $item['name'],
                'extra' => $item['extra'] ?? '',
                'Plant' => $item['code'],
                'PlantName' => $item['plantName'] ?? $item['name'],
            ], $plantsResult['items'])
            : $this->sapService->getFormattedFallbackPlants();

        // Purchasing organizations and groups for APL
        $purchasingOrganizations = [
            ['code' => '1100', 'name' => '1100 - Purchasing Org 1100'],
            ['code' => '1200', 'name' => '1200 - APL Domestic Sourcing Org'],
        ];

        $purchasingGroups = [
            ['code' => '103', 'name' => '103 - Purchasing Group 103'],
            ['code' => '001', 'name' => '001 - Purchasing Group 001'],
            ['code' => '101', 'name' => '101 - Central Purchasing'],
            ['code' => '102', 'name' => '102 - Technical Purchasing'],
            ['code' => '104', 'name' => '104 - Projects Purchasing'],
            ['code' => '112', 'name' => '112 - Chemicals Purchasing'],
            ['code' => '114', 'name' => '114 - Reagents Purchasing'],
            ['code' => '119', 'name' => '119 - Services Purchasing'],
        ];

        $storageLocations = [
            ['code' => 'M100', 'name' => 'M100 - Main Raw Material Store'],
            ['code' => 'SSM2', 'name' => 'SSM2 - Safety & Spares Store 2'],
            ['code' => 'SSM3', 'name' => 'SSM3 - Spares Store 3'],
            ['code' => 'SL01', 'name' => 'SL01 - General Warehouse 1'],
        ];

        $costCenters = [
            ['code' => '10101PCC01', 'name' => '10101PCC01 - Plant Cost Center 01'],
            ['code' => '12001101', 'name' => '12001101 - Chemical Processing Plant 1200'],
        ];

        $glAccounts = [
            ['code' => '65301000', 'name' => '65301000 - Consumed Materials'],
            ['code' => '410100001', 'name' => '410100001 - Raw Material Consumption'],
            ['code' => '410100006', 'name' => '410100006 - Operating Supplies Expense'],
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
                'plants' => $plants,
                'accountAssignmentCategories' => $accountAssignmentCategories,
                'materialGroups' => $materialGroups,
                'materials' => $materials,
                'unitsOfMeasure' => $unitsOfMeasure,
                'materialTypes' => $materialTypes,
                'currencies' => [
                    ['code' => 'INR', 'name' => 'INR - Indian Rupee'],
                    ['code' => 'USD', 'name' => 'USD - US Dollar'],
                    ['code' => 'EUR', 'name' => 'EUR - Euro'],
                ],
                'taxCodes' => [
                    ['code' => 'G3', 'name' => 'G3 - 18% Input GST'],
                    ['code' => 'G4', 'name' => 'G4 - 12% Input GST'],
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
                'purchasingOrganizations' => $purchasingOrganizations,
                'purchasingGroups' => $purchasingGroups,
                'storageLocations' => $storageLocations,
                'costCenters' => $costCenters,
                'glAccounts' => $glAccounts,
                'batches' => [],
                'revisionLevels' => [],
                'desiredSuppliers' => [],
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
     * Store a newly created purchase requisition in local DB and sync directly with SAP S/4HANA Cloud.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'is_draft' => 'nullable|boolean',
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
            'items.*.attachment_file' => 'nullable|file|max:25600',
            'attachments' => 'nullable|array',
            'attachments.*' => 'nullable|file|max:25600',
        ]);

        /** @var PurchaseRequisition|null $pr */
        $pr = null;
        $prNumber = '';
        $isDraft = !empty($validated['is_draft']) || $request->boolean('is_draft');

        // Validate against unsupported SAP Account Assignment Categories (e.g. 'N' Network for standard PR items)
        if (!$isDraft) {
            foreach ($validated['items'] as $index => $item) {
                $aac = strtoupper(trim($item['account_assignment_category'] ?? ''));
                if ($aac === 'N') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.account_assignment_category" => "Account Assignment Category 'N' (Network) is not supported for standard Purchase Requisitions in SAP S/4HANA Cloud (SAP error ME/066). Leave blank for Stock/Inventory materials or select 'K' for Cost Center.",
                    ]);
                }
            }
        }

        DB::transaction(function () use ($validated, $request, $isDraft, &$pr, &$prNumber) {
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
                'pr_type' => $validated['pr_type'] ?? 'ZMAT',
                'auto_source_determination' => !empty($validated['auto_source_determination']),
                'company_code' => $validated['company_code'] ?? '1000',
                'plant' => $primaryPlant,
                'total_amount' => $totalAmount,
                'currency' => $validated['currency'] ?? 'INR',
                'requisitioner' => $validated['requisitioner'] ?? ($request->user()?->name ?? 'Requester'),
                'approval_status' => $isDraft ? 'draft' : 'approved',
                'is_draft' => $isDraft ? 1 : 0,
                'sap_sync_status' => 'pending',
                'sap_sync_message' => $isDraft
                    ? 'Saved as Draft in local MySQL database (is_draft = 1). Not synced to SAP server.'
                    : 'Created in local database. Ready for SAP S/4HANA OData V4 POST.',
            ]);

            foreach ($validated['items'] as $index => $itemData) {
                $pu = !empty($itemData['price_unit']) && (float)$itemData['price_unit'] > 0 ? (float)$itemData['price_unit'] : 1;
                $itemTotal = (((float)$itemData['quantity'] / $pu) * (float)$itemData['unit_price']);
                $itemNum = !empty($itemData['item_number']) ? $itemData['item_number'] : str_pad(($index + 1) * 10, 5, '0', STR_PAD_LEFT);

                // Detect uploaded attachment file for this item line
                $uploadedFile = $request->file("items.{$index}.attachment_file")
                    ?? ($request->file('items')[$index]['attachment_file'] ?? null);

                $attName = $itemData['attachment_name'] ?? null;
                if ($uploadedFile && $uploadedFile->isValid()) {
                    $attName = $uploadedFile->getClientOriginalName();
                }

                $prItem = PurchaseRequisitionItem::create([
                    'purchase_requisition_id' => $pr->id,
                    'item_number' => $itemNum,
                    'item_type' => $itemData['item_type'] ?? 'material',
                    'material_code' => $itemData['material_code'] ?? null,
                    'supplier_material_number' => $itemData['supplier_material_number'] ?? null,
                    'batch' => $itemData['batch'] ?? null,
                    'revision_level' => $itemData['revision_level'] ?? null,
                    'description' => $itemData['description'],
                    'material_group' => $itemData['material_group'] ?? 'YBPM01',
                    'desired_supplier' => $itemData['desired_supplier'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                    'unit_price' => $itemData['unit_price'],
                    'price_unit' => $pu,
                    'total_price' => $itemTotal,
                    'currency' => $itemData['currency'] ?? $pr->currency,
                    'tax_code' => $itemData['tax_code'] ?? null,
                    'po_price_type' => $itemData['po_price_type'] ?? 'Do not adopt',
                    'plant' => $itemData['plant'] ?? $pr->plant,
                    'storage_location' => $itemData['storage_location'] ?? null,
                    'account_assignment_category' => $itemData['account_assignment_category'] ?? '',
                    'requirement_tracking_number' => $itemData['requirement_tracking_number'] ?? null,
                    'cost_center' => !empty($itemData['account_assignment_category']) ? ($itemData['cost_center'] ?? '10101PCC01') : null,
                    'gl_account' => !empty($itemData['account_assignment_category']) ? ($itemData['gl_account'] ?? '65301000') : null,
                    'purchasing_organization' => $itemData['purchasing_organization'] ?? '1100',
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
                    'attachment_doc_type' => $itemData['attachment_doc_type'] ?? 'SL1',
                    'attachment_name' => $attName,
                ]);

                // Store uploaded attachment file in database and local public storage disk
                if ($uploadedFile && $uploadedFile->isValid()) {
                    $storedPath = $uploadedFile->store("attachments/{$prNumber}", 'public');
                    Attachment::create([
                        'purchase_requisition_id' => $pr->id,
                        'purchase_requisition_item_id' => $prItem->id,
                        'item_number' => $itemNum,
                        'file_name' => $uploadedFile->getClientOriginalName(),
                        'file_path' => $storedPath,
                        'file_size' => $uploadedFile->getSize(),
                        'mime_type' => $uploadedFile->getClientMimeType() ?: $uploadedFile->getMimeType(),
                        'attachment_doc_type' => $itemData['attachment_doc_type'] ?? 'SL1',
                        'sap_sync_status' => 'pending',
                        'user_id' => $request->user()?->id,
                    ]);
                }
            }

            // Store any general PR-level attachments
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $generalFile) {
                    if ($generalFile && $generalFile->isValid()) {
                        $storedPath = $generalFile->store("attachments/{$prNumber}", 'public');
                        Attachment::create([
                            'purchase_requisition_id' => $pr->id,
                            'purchase_requisition_item_id' => null,
                            'item_number' => null,
                            'file_name' => $generalFile->getClientOriginalName(),
                            'file_path' => $storedPath,
                            'file_size' => $generalFile->getSize(),
                            'mime_type' => $generalFile->getClientMimeType() ?: $generalFile->getMimeType(),
                            'attachment_doc_type' => 'SL1',
                            'sap_sync_status' => 'pending',
                            'user_id' => $request->user()?->id,
                        ]);
                    }
                }
            }

            $pr->load(['items', 'attachments']);
            $pr->update([
                'sap_payload' => $pr->toSapODataV4Payload(),
            ]);
        });

        // If saved as Draft (is_draft = 1), keep in local database only and do NOT sync to SAP server
        if ($pr->is_draft) {
            return redirect()->route('dashboard')->with(
                'success',
                "Purchase Requisition {$prNumber} successfully saved as Draft in local database (is_draft = 1). Draft PRs cannot be synced to SAP server until draft status is removed."
            );
        }

        // Sync newly created PR to SAP S/4HANA Cloud server (only when is_draft = 0)
        $pr->load(['items', 'attachments']);
        $syncResult = $this->sapService->postPurchaseRequisition($pr);

        if ($syncResult['success']) {
            $sapPrNum = $syncResult['sap_pr_number'];
            $pr->update([
                'sap_pr_number' => $sapPrNum,
                'sap_sync_status' => 'synced',
                'sap_synced_at' => now(),
                'sap_sync_message' => $syncResult['message'],
                'sap_payload' => $syncResult['payload'],
                'sap_response' => $syncResult['response'],
            ]);

            // Dispatch any attached files to SAP Attachment Service (API_CV_ATTACHMENT_SRV)
            foreach ($pr->attachments as $att) {
                $this->sapService->uploadAttachmentToSap($att, $sapPrNum, $att->item_number);
            }

            return redirect()->route('dashboard')->with(
                'success',
                "Purchase Requisition {$prNumber} successfully created in local database and synced to SAP S/4HANA Cloud (SAP PR #{$sapPrNum})!"
            );
        } else {
            $pr->update([
                'sap_sync_status' => 'failed',
                'sap_sync_message' => $syncResult['message'] ?? 'Failed to sync with SAP',
                'sap_payload' => $syncResult['payload'] ?? $pr->sap_payload,
                'sap_response' => $syncResult['response'] ?? null,
            ]);

            return redirect()->route('dashboard')->with(
                'warning',
                "Purchase Requisition {$prNumber} created in local database, but SAP S/4HANA Cloud sync failed: {$syncResult['message']}. You can re-sync it from the dashboard."
            );
        }
    }

    /**
     * Post/Sync Purchase Requisition to SAP Public Cloud via OData V4 API.
     */
    public function sync(Request $request, PurchaseRequisition $purchaseRequisition): RedirectResponse
    {
        if ($request->user() && $request->user()->isEmployee()) {
            return back()->with('error', 'Employees are not authorized to trigger direct SAP Cloud dispatch.');
        }

        // The draft PRs cannot be synced to the SAP server until the Draft status is 0
        if ($purchaseRequisition->is_draft) {
            return back()->with('error', "Draft Purchase Requisition ({$purchaseRequisition->pr_number}) cannot be synced to SAP server until Draft status is 0.");
        }

        $purchaseRequisition->load(['items', 'attachments']);
        $syncResult = $this->sapService->postPurchaseRequisition($purchaseRequisition);

        if ($syncResult['success']) {
            $sapPrNum = $syncResult['sap_pr_number'];
            $purchaseRequisition->update([
                'sap_pr_number' => $sapPrNum,
                'sap_sync_status' => 'synced',
                'sap_synced_at' => now(),
                'sap_sync_message' => $syncResult['message'],
                'sap_payload' => $syncResult['payload'],
                'sap_response' => $syncResult['response'],
            ]);

            // Dispatch any attached files to SAP Attachment Service (API_CV_ATTACHMENT_SRV)
            foreach ($purchaseRequisition->attachments as $att) {
                $this->sapService->uploadAttachmentToSap($att, $sapPrNum, $att->item_number);
            }

            return back()->with('success', "PR posted to SAP Public Cloud successfully (SAP #{$sapPrNum})");
        } else {
            $purchaseRequisition->update([
                'sap_sync_status' => 'failed',
                'sap_sync_message' => $syncResult['message'] ?? 'Failed to sync with SAP',
                'sap_payload' => $syncResult['payload'] ?? $purchaseRequisition->sap_payload,
                'sap_response' => $syncResult['response'] ?? null,
            ]);

            return back()->with('error', "SAP Cloud sync failed: " . ($syncResult['message'] ?? 'Unknown error'));
        }
    }

    /**
     * Finalize a draft purchase requisition (toggle is_draft to 0).
     */
    public function finalizeDraft(Request $request, PurchaseRequisition $purchaseRequisition): RedirectResponse
    {
        if (!$purchaseRequisition->is_draft) {
            return back()->with('info', "Purchase Requisition {$purchaseRequisition->pr_number} is already finalized (is_draft = 0).");
        }

        $purchaseRequisition->update([
            'is_draft' => 0,
            'approval_status' => 'approved',
            'sap_sync_message' => 'Draft finalized in local database. Ready for SAP S/4HANA OData V4 sync.',
        ]);

        return back()->with('success', "Purchase Requisition {$purchaseRequisition->pr_number} draft finalized (is_draft = 0). It is now eligible for SAP Cloud sync.");
    }

    /**
     * Download or view a PR attachment file.
     */
    public function downloadAttachment(Attachment $attachment)
    {
        if (!Storage::disk('public')->exists($attachment->file_path)) {
            abort(404, 'Attachment file not found on server.');
        }

        return Storage::disk('public')->download($attachment->file_path, $attachment->file_name);
    }
}
