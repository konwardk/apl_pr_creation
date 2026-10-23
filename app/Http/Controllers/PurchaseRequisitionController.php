<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\HeaderOption;
use App\Models\ItemCategory;
use App\Models\PrDocumentType;
use App\Models\PurchasingGroup;
use App\Models\PurchasingOrganization;
use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Models\ContractRequisition;
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
     * Fetch Materials / Products from SAP S/4HANA Cloud CDS View (YY1_PRODUCTPLANTVALUATION_CDS)
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
     * Fetch Storage Locations from SAP S/4HANA Cloud Value Help Service (ZUI_TMS_DESPATCH_04 / StorageLocationVH)
     */
    public function getStorageLocations(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $plant = $request->query('plant');
        $result = $this->sapService->fetchStorageLocationsFromSap($search, $plant);

        return response()->json($result);
    }

    /**
     * Fetch Material Groups from SAP S/4HANA Cloud CDS View (YY1_MATERIALGROUP_CDS)
     */
    public function getMaterialGroups(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $result = $this->sapService->fetchMaterialGroupsFromCdsView($search);

        return response()->json($result);
    }

    /**
     * Fetch G/L Accounts from SAP S/4HANA Cloud CDS View (YY1_I_GLACCOUNTINCOMPANYCO_CDS)
     */
    public function getGlAccounts(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $companyCode = $request->query('companyCode') ?? $request->query('company_code') ?? '1000';
        $result = $this->sapService->fetchGlAccountsFromCdsView($search, $companyCode);

        return response()->json($result);
    }

    /**
     * Fetch Cost Centers from SAP S/4HANA Cloud CDS View (YY1_COSTCENTER_CDS)
     */
    public function getCostCenters(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $companyCode = $request->query('companyCode') ?? $request->query('company_code') ?? '1000';
        $controllingArea = $request->query('controllingArea') ?? $request->query('controlling_area');
        $result = $this->sapService->fetchCostCentersFromCdsView($search, $companyCode, $controllingArea);

        return response()->json($result);
    }

    /**
     * Fetch Suppliers from SAP S/4HANA Cloud CDS View (YY1_SUPPLIER_CDS)
     */
    public function getSuppliers(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $result = $this->sapService->fetchSuppliersFromCdsView($search);

        return response()->json($result);
    }

    /**
     * Fetch Units of Measure from SAP S/4HANA Cloud CDS View (YY1_UNITOFMEASUREMENT_CDS)
     */
    public function getUnitsOfMeasure(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $result = $this->sapService->fetchUnitsOfMeasureFromCdsView($search);

        return response()->json($result);
    }

    /**
     * Fetch Purchasing Info Records from SAP S/4HANA Cloud CDS View (YY1_INFORECORD_CDS)
     */
    public function getInfoRecords(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');
        $supplier = $request->query('supplier');
        $material = $request->query('material');
        $result = $this->sapService->fetchInfoRecordsFromCdsView($search, $supplier, $material);

        return response()->json($result);
    }

    /**
     * Display the purchase requisition creation page.
     */

    public function create(Request $request): Response
    {
        $config = $this->getMasterDataConfig($request);
        $nextCrSeq = (ContractRequisition::max('id') ?? 0) + 1;
        $defaultCrNo = 'CR-' . date('Y') . '-' . str_pad($nextCrSeq, 5, '0', STR_PAD_LEFT);

        return Inertia::render('purchase-requisitions/create', array_merge($config, [
            'defaultCrNo' => $defaultCrNo,
        ]));
    }

    /**
     * Display the specified purchase requisition details (View Page).
     */
    public function show(Request $request, PurchaseRequisition $purchaseRequisition): Response|RedirectResponse
    {
        $user = $request->user();
        if ($user && $user->isEmployee() && $purchaseRequisition->user_id !== $user->id) {
            return redirect()->route('dashboard')->with(
                'error',
                'You are not authorized to view this purchase requisition.'
            );
        }

        $purchaseRequisition->load([
            'items',
            'headerOption',
            'attachments',
            'contractRequisition',
            'contractRequisitionLocal',
            'user',
            'user.department',
        ]);

        $cr = $purchaseRequisition->contractRequisition ?? $purchaseRequisition->contractRequisitionLocal;
        if (!$cr) {
            $cr = ContractRequisition::where('purchase_requisition_id', $purchaseRequisition->id)
                ->orWhere('pr_number_sap', $purchaseRequisition->sap_pr_number)
                ->first();
        }

        $docType = PrDocumentType::where('code', $purchaseRequisition->pr_type)->first();

        return Inertia::render('purchase-requisitions/show', [
            'purchaseRequisition' => $purchaseRequisition,
            'contractRequisition' => $cr,
            'documentType' => $docType ? [
                'code' => $docType->code,
                'name' => $docType->name,
                'extra' => $docType->description ?: $docType->category,
            ] : null,
        ]);
    }

    /**
     * Display the purchase requisition edit page (for draft PRs and failed sync PRs).
     */
    public function edit(Request $request, PurchaseRequisition $purchaseRequisition): Response|RedirectResponse
    {
        if (!$purchaseRequisition->is_draft && $purchaseRequisition->sap_sync_status !== 'failed') {
            return redirect()->route('dashboard')->with(
                'error',
                "Purchase Requisition {$purchaseRequisition->pr_number} is already synced to SAP and cannot be edited."
            );
        }

        $user = $request->user();
        if ($user && $user->isEmployee() && $purchaseRequisition->user_id !== $user->id) {
            return redirect()->route('dashboard')->with(
                'error',
                'You are not authorized to edit this purchase requisition.'
            );
        }

        $purchaseRequisition->load(['items', 'headerOption', 'attachments', 'contractRequisition', 'contractRequisitionLocal']);
        $config = $this->getMasterDataConfig($request);
        $cr = $purchaseRequisition->contractRequisition ?? $purchaseRequisition->contractRequisitionLocal;
        $defaultCrNo = $cr?->cr_no ?? ('CR-' . date('Y') . '-' . str_pad($purchaseRequisition->id, 5, '0', STR_PAD_LEFT));

        return Inertia::render('purchase-requisitions/edit', array_merge($config, [
            'purchaseRequisition' => $purchaseRequisition,
            'defaultCrNo' => $defaultCrNo,
        ]));
    }

    /**
     * Prepare SAP master data and reference configurations for PR forms.
     */
    protected function getMasterDataConfig(Request $request): array
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

        // 3. Item categories from internal database (apl_pr_db)
        $itemCategories = ItemCategory::where('is_active', true)
            ->orderBy('code')
            ->get();

        $itemCategoriesData = $itemCategories->map(fn($ic) => [
            'code' => $ic->code,
            'name' => $ic->name,
            'extra' => $ic->description ?: '',
        ])->toArray();

        // 4. Account Assignment Categories from live SAP CDS view YY1_ACCOUNTASSIGNMENTCAT_CDS
        $acctResult = $this->sapService->fetchAccountAssignmentCategoriesFromCdsView();
        $accountAssignmentCategories = ($acctResult['success'] ?? false && !empty($acctResult['items']))
            ? array_map(fn($item) => [
                'code' => $item['code'],
                'name' => $item['name'],
                'extra' => $item['extra'] ?? '',
            ], $acctResult['items'])
            : $this->sapService->getFormattedFallbackAccountAssignmentCategories();

        // 5. Materials from live SAP CDS view YY1_PRODUCTPLANTVALUATION_CDS
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
                'Plant' => $item['Plant'] ?? $item['ValuationArea'] ?? '',
                'WeightUnit' => $item['WeightUnit'] ?? '',
                'BaseUnit' => $item['BaseUnit'] ?? $item['uom'] ?? 'EA',
                'Division' => $item['Division'] ?? '',
                'UnitOfMeasure' => $item['UnitOfMeasure'] ?? $item['uom'] ?? 'PC',
                'ProductGroup' => $item['ProductGroup'] ?? $item['materialGroup'] ?? '',
                'ProductType' => $item['ProductType'] ?? $item['materialType'] ?? '',
                'MovingAveragePrice' => $item['MovingAveragePrice'] ?? '0.00',
                'StandardPrice' => $item['StandardPrice'] ?? '0.00',
                'InventoryValuationProcedure' => $item['InventoryValuationProcedure'] ?? '',
                'priceControl' => $item['priceControl'] ?? $item['InventoryValuationProcedure'] ?? '',
                'Currency' => $item['Currency'] ?? '',
                'ValuationArea' => $item['ValuationArea'] ?? $item['Plant'] ?? '',
                'raw_data' => $item['raw_data'] ?? [],
            ], $materialsResult['items'] ?? [])
            : [];

        // 6. Material Groups from live SAP CDS view YY1_MATERIALGROUP_CDS
        $matGroupResult = $this->sapService->fetchMaterialGroupsFromCdsView();
        $materialGroups = ($matGroupResult['success'] ?? false && !empty($matGroupResult['items']))
            ? array_map(fn($item) => [
                'code' => $item['code'],
                'name' => $item['name'],
                'extra' => $item['extra'] ?? '',
                'MaterialGroup' => $item['MaterialGroup'] ?? $item['code'],
                'MaterialGroupName' => $item['MaterialGroupName'] ?? $item['name'],
                'Language' => $item['Language'] ?? 'EN',
            ], $matGroupResult['items'])
            : $this->sapService->getFormattedFallbackMaterialGroups();

        // 7. Extract real Units of Measure dynamically from SAP master materials
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

        // 8. Extract real Material Types dynamically from SAP master materials
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

        // 9. Plants from live SAP S/4HANA Cloud service (ZUI_TMS_DESPATCH_04 / PlantVH)
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

        // Purchasing organizations retrieved from MySQL database (synced from SAP YY1_PURCHASEORGANIZATION_CDS)
        $dbPurchasingOrgs = PurchasingOrganization::active()->orderBy('code')->get();
        if ($dbPurchasingOrgs->isNotEmpty()) {
            $purchasingOrganizations = $dbPurchasingOrgs->map(function ($org) {
                $plantsStr = !empty($org->plants) ? implode(', ', $org->plants) : '';
                return [
                    'code' => $org->code,
                    'name' => "{$org->code} - {$org->name}",
                    'purchasingOrgName' => $org->name,
                    'PurchasingOrganization' => $org->code,
                    'PurchasingOrganizationName' => $org->name,
                    'plants' => $org->plants ?? [],
                    'extra' => $plantsStr ? "Mapped Plants: {$plantsStr}" : ($org->description ?: 'Company Code: 1000'),
                ];
            })->toArray();
        } else {
            $purchasingOrganizations = array_map(function ($org) {
                return [
                    'code' => $org['code'],
                    'name' => "{$org['code']} - {$org['name']}",
                    'purchasingOrgName' => $org['name'],
                    'PurchasingOrganization' => $org['code'],
                    'PurchasingOrganizationName' => $org['name'],
                    'plants' => $org['plants'] ?? [],
                    'extra' => $org['extra'] ?? '',
                ];
            }, $this->sapService->getFormattedFallbackPurchasingOrganizations());
        }

        $dbPurchasingGroups = PurchasingGroup::active()
            ->orderBy('code')
            ->get();

        if ($dbPurchasingGroups->isNotEmpty()) {
            $purchasingGroups = $dbPurchasingGroups->map(function ($pg) {
                $desc = $pg->description ?: $pg->name;
                return [
                    'code' => $pg->code,
                    'name' => "{$pg->code} - {$desc}",
                    'description' => $desc,
                    'PurchasingGroup' => $pg->code,
                    'PurchasingGroupName' => $desc,
                    'extra' => $desc,
                    'email' => $pg->email,
                    'phone_number' => $pg->phone_number,
                ];
            })->toArray();
        } else {
            $purchasingGroups = $this->sapService->getFormattedFallbackPurchasingGroups();
        }

        // 10. Storage Locations from live SAP S/4HANA Cloud service (ZUI_TMS_DESPATCH_04 / StorageLocationVH)
        $storageLocationsResult = $this->sapService->fetchStorageLocationsFromSap();
        $storageLocations = ($storageLocationsResult['success'] ?? false && !empty($storageLocationsResult['items']))
            ? $storageLocationsResult['items']
            : $this->sapService->getFormattedFallbackStorageLocations();

        $ccResult = $this->sapService->fetchCostCentersFromCdsView();
        $costCenters = ($ccResult['success'] ?? false && !empty($ccResult['items']))
            ? $ccResult['items']
            : $this->sapService->getFormattedFallbackCostCenters();

        $glResult = $this->sapService->fetchGlAccountsFromCdsView();
        $glAccounts = ($glResult['success'] ?? false && !empty($glResult['items']))
            ? $glResult['items']
            : $this->sapService->getFormattedFallbackGlAccounts();

        $supResult = $this->sapService->fetchSuppliersFromCdsView();
        $suppliers = ($supResult['success'] ?? false && !empty($supResult['items']))
            ? $supResult['items']
            : $this->sapService->getFormattedFallbackSuppliers();

        return [
            'headerOptions' => $headerOptions,
            'prDocumentTypes' => $prDocumentTypes,
            'itemCategories' => $itemCategories,
            'masterData' => [
                'headerOptions' => $headerOptions->map(fn($opt) => [
                    'code' => (string)$opt->id,
                    'name' => $opt->name,
                    'extra' => $opt->code ?: '',
                ])->toArray(),
                'documentTypes' => $docTypesData,
                'itemCategories' => $itemCategoriesData,
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
                'desiredSuppliers' => $suppliers,
                'attachmentDocTypes' => [
                    ['code' => 'SL1', 'name' => 'For External Use (SL1)'],
                    ['code' => 'SL9', 'name' => 'For Internal Use (SL9)'],
                    ['code' => 'YB0', 'name' => 'Office-Documents (YB0)'],
                    ['code' => 'YP1', 'name' => 'Image of Damage (YP1)'],
                    ['code' => 'YP2', 'name' => 'Manuals (YP2)'],
                ],
            ]
        ];
    }

    /**
     * Store a newly created purchase requisition in local DB and sync directly with SAP S/4HANA Cloud.
     */
    public function store(Request $request): RedirectResponse|JsonResponse
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
            'items.*.item_category' => 'nullable|string|max:10',
            'items.*.item_number' => 'nullable|string|max:10',
            'items.*.description' => 'required|string|max:255',
            'items.*.material_code' => 'nullable|string|max:50',
            'items.*.supplier_material_number' => 'nullable|string|max:100',
            'items.*.manufacturer_part_number' => 'nullable|string|max:100',
            'items.*.batch' => 'nullable|string|max:50',
            'items.*.revision_level' => 'nullable|string|max:20',
            'items.*.material_group' => 'required|string|max:20',
            'items.*.desired_supplier' => 'nullable|string|max:100',
            'items.*.fixed_vendor' => 'nullable|string|max:100',
            'items.*.supplying_plant' => 'nullable|string|max:10',
            'items.*.agreement_number' => 'nullable|string|max:20',
            'items.*.agreement_item' => 'nullable|string|max:10',
            'items.*.info_record' => 'nullable|string|max:20',
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
            'contract_requisition' => 'nullable|array',
            'contract_requisition.cr_no' => 'nullable|string|max:20',
            'contract_requisition.contract_title' => 'nullable|string|max:500',
            'contract_requisition.scope_of_work' => 'nullable|string|max:500',
            'contract_requisition.payment_terms' => 'nullable|string|max:500',
            'contract_requisition.bidders_qualification_criteria' => 'nullable|string|max:500',
            'contract_requisition.special_terms_condition' => 'nullable|string|max:500',
            'contract_requisition.guarantee_warranty_period' => 'nullable|string|max:500',
            'contract_requisition.defect_liability_period' => 'nullable|string|max:50',
            'contract_requisition.others' => 'nullable|string|max:500',
            'contract_requisition.requisitioner_name' => 'nullable|string|max:100',
            'contract_requisition.req_designation' => 'nullable|string|max:500',
            'contract_requisition.req_department' => 'nullable|string|max:500',
            'contract_requisition.tender_type' => 'nullable|string|max:50',
            'contract_requisition.tender_estimate_value' => 'nullable|string|max:50',
            'contract_requisition.total_pr_value' => 'nullable|numeric',
            'contract_requisition.total_pr_value_in_word' => 'nullable|string|max:500',
            'contract_requisition.custom_field_1' => 'nullable|string|max:500',
            'contract_requisition.custom_field_2' => 'nullable|string|max:500',
            'contract_requisition.custom_field_3' => 'nullable|string|max:500',
            'contract_requisition.custom_field_4' => 'nullable|string|max:500',
            'contract_requisition.custom_field_5' => 'nullable|string|max:500',
            'contract_requisition.custom_field_6' => 'nullable|string|max:500',
            'contract_requisition.custom_field_7' => 'nullable|string|max:500',
            'contract_requisition.custom_field_8' => 'nullable|string|max:500',
        ]);

        /** @var PurchaseRequisition|null $pr */
        $pr = null;
        $prNumber = '';
        $isDraft = !empty($validated['is_draft']) || $request->boolean('is_draft');

        // Validate against unsupported SAP Account Assignment Categories and unmaintained materials
        if (!$isDraft) {
            foreach ($validated['items'] as $index => $item) {
                $aac = strtoupper(trim($item['account_assignment_category'] ?? ''));
                if ($aac === 'N') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.account_assignment_category" => "Account Assignment Category 'N' (Network) is not supported for standard Purchase Requisitions in SAP S/4HANA Cloud (SAP error ME/066). Leave blank for Stock/Inventory materials or select 'K' for Cost Center.",
                    ]);
                }
                if ($aac === 'A') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.account_assignment_category" => "Account Assignment Category 'A' (Asset) requires an SAP Fixed Asset Master Number, which is not configured. Leave blank for standard Stock/Inventory items or select 'K' for Cost Center.",
                    ]);
                }

                $mat = strtoupper(trim($item['material_code'] ?? ''));
                if ($mat === 'NUTS') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.material_code" => "Material 'NUTS' has not been extended to the Purchasing View for Plant 1200 in SAP S/4HANA Cloud (SAP error ME/046). Please maintain its Purchasing View in SAP or choose a maintained material such as '1300000001' or '1200000000'.",
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
                    'item_category' => $itemData['item_category'] ?? null,
                    'material_code' => $itemData['material_code'] ?? null,
                    'supplier_material_number' => $itemData['supplier_material_number'] ?? null,
                    'manufacturer_part_number' => $itemData['manufacturer_part_number'] ?? ($itemData['supplier_material_number'] ?? null),
                    'batch' => $itemData['batch'] ?? null,
                    'revision_level' => $itemData['revision_level'] ?? null,
                    'description' => $itemData['description'],
                    'material_group' => $itemData['material_group'] ?? 'YBPM01',
                    'desired_supplier' => $itemData['desired_supplier'] ?? null,
                    'fixed_vendor' => $itemData['fixed_vendor'] ?? null,
                    'supplying_plant' => $itemData['supplying_plant'] ?? null,
                    'agreement_number' => $itemData['agreement_number'] ?? null,
                    'agreement_item' => $itemData['agreement_item'] ?? null,
                    'info_record' => $itemData['info_record'] ?? null,
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
                    'purchasing_group' => !empty($itemData['purchasing_group']) ? $itemData['purchasing_group'] : ($request->user()?->purchasing_group ?: '103'),
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

            // Create Contract Requisition if submitted
            $crData = $request->input('contract_requisition');
            if (!empty($crData) && (!empty($crData['cr_no']) || !empty($crData['contract_title']) || !empty($crData['scope_of_work']))) {
                $crNo = !empty($crData['cr_no']) ? $crData['cr_no'] : ('CR-' . date('Y') . '-' . str_pad($nextSeq, 5, '0', STR_PAD_LEFT));
                ContractRequisition::create([
                    'cr_no' => $crNo,
                    'pr_number_sap' => $pr->sap_pr_number,
                    'purchase_requisition_id' => $pr->id,
                    'contract_title' => $crData['contract_title'] ?? null,
                    'scope_of_work' => $crData['scope_of_work'] ?? null,
                    'payment_terms' => $crData['payment_terms'] ?? null,
                    'bidders_qualification_criteria' => $crData['bidders_qualification_criteria'] ?? null,
                    'special_terms_condition' => $crData['special_terms_condition'] ?? null,
                    'guarantee_warranty_period' => $crData['guarantee_warranty_period'] ?? null,
                    'defect_liability_period' => $crData['defect_liability_period'] ?? null,
                    'others' => $crData['others'] ?? null,
                    'requisitioner_name' => !empty($crData['requisitioner_name']) ? $crData['requisitioner_name'] : ($pr->requisitioner ?: ($request->user()?->name ?? 'Requester')),
                    'req_designation' => !empty($crData['req_designation']) ? $crData['req_designation'] : ($request->user()?->designation ?? null),
                    'req_department' => !empty($crData['req_department']) ? $crData['req_department'] : ($request->user()?->department?->name ?? null),
                    'tender_type' => $crData['tender_type'] ?? 'Single',
                    'tender_estimate_value' => $crData['tender_estimate_value'] ?? 'Excluding GST',
                    'total_pr_value' => !empty($crData['total_pr_value']) ? $crData['total_pr_value'] : $totalAmount,
                    'total_pr_value_in_word' => $crData['total_pr_value_in_word'] ?? null,
                    'custom_field_1' => $crData['custom_field_1'] ?? null,
                    'custom_field_2' => $crData['custom_field_2'] ?? null,
                    'custom_field_3' => $crData['custom_field_3'] ?? null,
                    'custom_field_4' => $crData['custom_field_4'] ?? null,
                    'custom_field_5' => $crData['custom_field_5'] ?? null,
                    'custom_field_6' => $crData['custom_field_6'] ?? null,
                    'custom_field_7' => $crData['custom_field_7'] ?? null,
                    'custom_field_8' => $crData['custom_field_8'] ?? null,
                    'sap_sync_status' => 'pending',
                ]);
            }

            $pr->load(['items', 'attachments']);
            $pr->update([
                'sap_payload' => $pr->toSapODataV4Payload(),
            ]);
        });

        // If saved as Draft (is_draft = 1), keep in local database only and do NOT sync to SAP server
        if ($pr->is_draft) {
            if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'success' => true,
                    'pr_id' => $pr->id,
                    'pr_number' => $prNumber,
                    'sap_pr_number' => null,
                    'is_draft' => true,
                    'sap_sync_status' => 'draft',
                    'total_amount' => $totalAmount,
                    'currency' => $pr->currency,
                    'message' => "Purchase Requisition {$prNumber} successfully saved as Draft in local database (is_draft = 1).",
                ]);
            }

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

            // Also dispatch Contract Requisition to SAP CBO YY1_API_CONTRACTREQUISITION
            $cr = $pr->contractRequisition ?? $pr->contractRequisitionLocal;
            if ($cr) {
                $cr->update(['pr_number_sap' => $sapPrNum]);
                $crSyncResult = $this->sapService->postContractRequisition($cr, $sapPrNum);
                $cr->update([
                    'sap_sync_status' => $crSyncResult['success'] ? 'synced' : 'failed',
                    'sap_synced_at' => $crSyncResult['success'] ? now() : null,
                    'sap_sync_message' => $crSyncResult['message'],
                    'sap_payload' => $crSyncResult['payload'],
                    'sap_response' => $crSyncResult['response'],
                ]);
            }

            if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'success' => true,
                    'pr_id' => $pr->id,
                    'pr_number' => $prNumber,
                    'sap_pr_number' => $sapPrNum,
                    'is_draft' => false,
                    'sap_sync_status' => 'synced',
                    'total_amount' => $totalAmount,
                    'currency' => $pr->currency,
                    'message' => "Purchase Requisition {$prNumber} successfully created in local database and synced to SAP S/4HANA Cloud (SAP PR #{$sapPrNum})!",
                ]);
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

            if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'success' => true,
                    'pr_id' => $pr->id,
                    'pr_number' => $prNumber,
                    'sap_pr_number' => null,
                    'is_draft' => false,
                    'sap_sync_status' => 'failed',
                    'total_amount' => $totalAmount,
                    'currency' => $pr->currency,
                    'warning' => "Purchase Requisition {$prNumber} created in local database, but SAP S/4HANA Cloud sync failed: {$syncResult['message']}.",
                    'message' => "Purchase Requisition {$prNumber} created in local database, but SAP S/4HANA Cloud sync failed: {$syncResult['message']}.",
                ]);
            }

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
        $user = $request->user();
        if ($user && $user->isEmployee() && $purchaseRequisition->user_id !== $user->id) {
            return back()->with('error', 'You are not authorized to trigger SAP Cloud dispatch for this purchase requisition.');
        }

        if ($purchaseRequisition->is_draft) {
            return back()->with(
                'error',
                "Draft Purchase Requisition ({$purchaseRequisition->pr_number}) cannot be synced to SAP server until Draft status is 0."
            );
        }

        $purchaseRequisition->load(['items', 'attachments']);

        foreach ($purchaseRequisition->items as $item) {
            $aac = strtoupper(trim($item->account_assignment_category ?? ''));
            if ($aac === 'N') {
                return back()->with('error', "Cannot sync: Item {$item->item_number} uses Account Assignment Category 'N' (Network) which is unsupported for standard PRs in SAP S/4HANA Cloud.");
            }
            if ($aac === 'A') {
                return back()->with('error', "Cannot sync: Item {$item->item_number} uses Account Assignment Category 'A' (Asset) which requires an SAP Fixed Asset Master Number.");
            }
            $mat = strtoupper(trim($item->material_code ?? ''));
            if ($mat === 'NUTS') {
                return back()->with('error', "Cannot sync: Material 'NUTS' is not maintained by Purchasing in Plant 1200 in SAP (SAP error ME/046). Please update item {$item->item_number} or maintain the Purchasing view for NUTS in SAP.");
            }
        }

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

            // Also sync Contract Requisition to SAP CBO YY1_API_CONTRACTREQUISITION
            $cr = $purchaseRequisition->contractRequisition ?? $purchaseRequisition->contractRequisitionLocal;
            if ($cr) {
                $cr->update(['pr_number_sap' => $sapPrNum]);
                $crSyncResult = $this->sapService->postContractRequisition($cr, $sapPrNum);
                $cr->update([
                    'sap_sync_status' => $crSyncResult['success'] ? 'synced' : 'failed',
                    'sap_synced_at' => $crSyncResult['success'] ? now() : null,
                    'sap_sync_message' => $crSyncResult['message'],
                    'sap_payload' => $crSyncResult['payload'],
                    'sap_response' => $crSyncResult['response'],
                ]);
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
     * Update an existing draft or failed purchase requisition in local DB and optionally sync with SAP S/4HANA Cloud.
     */
    public function update(Request $request, PurchaseRequisition $purchaseRequisition): RedirectResponse|JsonResponse
    {
        if (!$purchaseRequisition->is_draft && $purchaseRequisition->sap_sync_status !== 'failed') {
            if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'success' => false,
                    'message' => "Purchase Requisition {$purchaseRequisition->pr_number} is already synced to SAP and cannot be edited.",
                ], 422);
            }

            return redirect()->route('dashboard')->with(
                'error',
                "Purchase Requisition {$purchaseRequisition->pr_number} is already synced to SAP and cannot be edited."
            );
        }

        $user = $request->user();
        if ($user && $user->isEmployee() && $purchaseRequisition->user_id !== $user->id) {
            return redirect()->route('dashboard')->with(
                'error',
                'You are not authorized to update this purchase requisition.'
            );
        }

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
            'items.*.id' => 'nullable|integer',
            'items.*.item_type' => 'nullable|string|max:20',
            'items.*.item_category' => 'nullable|string|max:10',
            'items.*.item_number' => 'nullable|string|max:10',
            'items.*.description' => 'required|string|max:255',
            'items.*.material_code' => 'nullable|string|max:50',
            'items.*.supplier_material_number' => 'nullable|string|max:100',
            'items.*.manufacturer_part_number' => 'nullable|string|max:100',
            'items.*.batch' => 'nullable|string|max:50',
            'items.*.revision_level' => 'nullable|string|max:20',
            'items.*.material_group' => 'required|string|max:20',
            'items.*.desired_supplier' => 'nullable|string|max:100',
            'items.*.fixed_vendor' => 'nullable|string|max:100',
            'items.*.supplying_plant' => 'nullable|string|max:10',
            'items.*.agreement_number' => 'nullable|string|max:20',
            'items.*.agreement_item' => 'nullable|string|max:10',
            'items.*.info_record' => 'nullable|string|max:20',
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
            'contract_requisition' => 'nullable|array',
            'contract_requisition.cr_no' => 'nullable|string|max:20',
            'contract_requisition.contract_title' => 'nullable|string|max:500',
            'contract_requisition.scope_of_work' => 'nullable|string|max:500',
            'contract_requisition.payment_terms' => 'nullable|string|max:500',
            'contract_requisition.bidders_qualification_criteria' => 'nullable|string|max:500',
            'contract_requisition.special_terms_condition' => 'nullable|string|max:500',
            'contract_requisition.guarantee_warranty_period' => 'nullable|string|max:500',
            'contract_requisition.defect_liability_period' => 'nullable|string|max:50',
            'contract_requisition.others' => 'nullable|string|max:500',
            'contract_requisition.requisitioner_name' => 'nullable|string|max:100',
            'contract_requisition.req_designation' => 'nullable|string|max:500',
            'contract_requisition.req_department' => 'nullable|string|max:500',
            'contract_requisition.tender_type' => 'nullable|string|max:50',
            'contract_requisition.tender_estimate_value' => 'nullable|string|max:50',
            'contract_requisition.total_pr_value' => 'nullable|numeric',
            'contract_requisition.total_pr_value_in_word' => 'nullable|string|max:500',
            'contract_requisition.custom_field_1' => 'nullable|string|max:500',
            'contract_requisition.custom_field_2' => 'nullable|string|max:500',
            'contract_requisition.custom_field_3' => 'nullable|string|max:500',
            'contract_requisition.custom_field_4' => 'nullable|string|max:500',
            'contract_requisition.custom_field_5' => 'nullable|string|max:500',
            'contract_requisition.custom_field_6' => 'nullable|string|max:500',
            'contract_requisition.custom_field_7' => 'nullable|string|max:500',
            'contract_requisition.custom_field_8' => 'nullable|string|max:500',
        ]);

        $isDraft = !empty($validated['is_draft']) || $request->boolean('is_draft');
        $prNumber = $purchaseRequisition->pr_number;

        if (!$isDraft) {
            foreach ($validated['items'] as $index => $item) {
                $aac = strtoupper(trim($item['account_assignment_category'] ?? ''));
                if ($aac === 'N') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.account_assignment_category" => "Account Assignment Category 'N' (Network) is not supported for standard Purchase Requisitions in SAP S/4HANA Cloud (SAP error ME/066). Leave blank for Stock/Inventory materials or select 'K' for Cost Center.",
                    ]);
                }
                if ($aac === 'A') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.account_assignment_category" => "Account Assignment Category 'A' (Asset) requires an SAP Fixed Asset Master Number, which is not configured. Leave blank for standard Stock/Inventory items or select 'K' for Cost Center.",
                    ]);
                }

                $mat = strtoupper(trim($item['material_code'] ?? ''));
                if ($mat === 'NUTS') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        "items.{$index}.material_code" => "Material 'NUTS' has not been extended to the Purchasing View for Plant 1200 in SAP S/4HANA Cloud (SAP error ME/046). Please maintain its Purchasing View in SAP or choose a maintained material such as '1300000001' or '1200000000'.",
                    ]);
                }
            }
        }

        DB::transaction(function () use ($validated, $request, $isDraft, $purchaseRequisition, $prNumber) {
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $pu = !empty($item['price_unit']) && (float)$item['price_unit'] > 0 ? (float)$item['price_unit'] : 1;
                $totalAmount += (((float)$item['quantity'] / $pu) * (float)$item['unit_price']);
            }

            $primaryPlant = $validated['items'][0]['plant'] ?? ($validated['plant'] ?? $purchaseRequisition->plant);
            $primaryDesc = !empty($validated['description']) ? $validated['description'] : ($validated['items'][0]['description'] ?? $purchaseRequisition->description);

            $purchaseRequisition->update([
                'description' => $primaryDesc,
                'header_note' => $validated['header_note'] ?? null,
                'header_option_id' => $validated['header_option_id'] ?? null,
                'pr_type' => $validated['pr_type'] ?? $purchaseRequisition->pr_type,
                'auto_source_determination' => !empty($validated['auto_source_determination']),
                'company_code' => $validated['company_code'] ?? '1000',
                'plant' => $primaryPlant,
                'total_amount' => $totalAmount,
                'currency' => $validated['currency'] ?? $purchaseRequisition->currency,
                'requisitioner' => $validated['requisitioner'] ?? $purchaseRequisition->requisitioner,
                'approval_status' => $isDraft ? 'draft' : 'approved',
                'is_draft' => $isDraft ? 1 : 0,
                'sap_sync_status' => 'pending',
                'sap_sync_message' => $isDraft
                    ? 'Updated Draft in local MySQL database (is_draft = 1). Not synced to SAP server.'
                    : 'Updated in local database. Ready for SAP S/4HANA OData V4 POST.',
            ]);

            $keptItemIds = [];

            foreach ($validated['items'] as $index => $itemData) {
                $pu = !empty($itemData['price_unit']) && (float)$itemData['price_unit'] > 0 ? (float)$itemData['price_unit'] : 1;
                $itemTotal = (((float)$itemData['quantity'] / $pu) * (float)$itemData['unit_price']);
                $itemNum = !empty($itemData['item_number']) ? $itemData['item_number'] : str_pad(($index + 1) * 10, 5, '0', STR_PAD_LEFT);

                $uploadedFile = $request->file("items.{$index}.attachment_file")
                    ?? ($request->file('items')[$index]['attachment_file'] ?? null);

                $attName = $itemData['attachment_name'] ?? null;
                if ($uploadedFile && $uploadedFile->isValid()) {
                    $attName = $uploadedFile->getClientOriginalName();
                }

                $itemFields = [
                    'purchase_requisition_id' => $purchaseRequisition->id,
                    'item_number' => $itemNum,
                    'item_type' => $itemData['item_type'] ?? 'material',
                    'material_code' => $itemData['material_code'] ?? null,
                    'supplier_material_number' => $itemData['supplier_material_number'] ?? null,
                    'batch' => $itemData['batch'] ?? null,
                    'revision_level' => $itemData['revision_level'] ?? null,
                    'description' => $itemData['description'],
                    'item_category' => $itemData['item_category'] ?? null,
                    'material_code' => $itemData['material_code'] ?? null,
                    'supplier_material_number' => $itemData['supplier_material_number'] ?? null,
                    'manufacturer_part_number' => $itemData['manufacturer_part_number'] ?? ($itemData['supplier_material_number'] ?? null),
                    'batch' => $itemData['batch'] ?? null,
                    'revision_level' => $itemData['revision_level'] ?? null,
                    'description' => $itemData['description'],
                    'material_group' => $itemData['material_group'] ?? 'YBPM01',
                    'desired_supplier' => $itemData['desired_supplier'] ?? null,
                    'fixed_vendor' => $itemData['fixed_vendor'] ?? null,
                    'supplying_plant' => $itemData['supplying_plant'] ?? null,
                    'agreement_number' => $itemData['agreement_number'] ?? null,
                    'agreement_item' => $itemData['agreement_item'] ?? null,
                    'info_record' => $itemData['info_record'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit_of_measure' => $itemData['unit_of_measure'] ?? 'EA',
                    'unit_price' => $itemData['unit_price'],
                    'price_unit' => $pu,
                    'total_price' => $itemTotal,
                    'currency' => $itemData['currency'] ?? $purchaseRequisition->currency,
                    'tax_code' => $itemData['tax_code'] ?? null,
                    'po_price_type' => $itemData['po_price_type'] ?? 'Do not adopt',
                    'plant' => $itemData['plant'] ?? $purchaseRequisition->plant,
                    'storage_location' => $itemData['storage_location'] ?? null,
                    'account_assignment_category' => $itemData['account_assignment_category'] ?? '',
                    'requirement_tracking_number' => $itemData['requirement_tracking_number'] ?? null,
                    'cost_center' => !empty($itemData['account_assignment_category']) ? ($itemData['cost_center'] ?? '10101PCC01') : null,
                    'gl_account' => !empty($itemData['account_assignment_category']) ? ($itemData['gl_account'] ?? '65301000') : null,
                    'purchasing_organization' => $itemData['purchasing_organization'] ?? '1100',
                    'purchasing_group' => !empty($itemData['purchasing_group']) ? $itemData['purchasing_group'] : ($request->user()?->purchasing_group ?: '103'),
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
                ];

                $prItem = null;
                if (!empty($itemData['id'])) {
                    $prItem = PurchaseRequisitionItem::where('purchase_requisition_id', $purchaseRequisition->id)
                        ->where('id', $itemData['id'])
                        ->first();
                }

                if ($prItem) {
                    $prItem->update($itemFields);
                } else {
                    $prItem = PurchaseRequisitionItem::create($itemFields);
                }

                $keptItemIds[] = $prItem->id;

                if ($uploadedFile && $uploadedFile->isValid()) {
                    $storedPath = $uploadedFile->store("attachments/{$prNumber}", 'public');
                    Attachment::create([
                        'purchase_requisition_id' => $purchaseRequisition->id,
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

            PurchaseRequisitionItem::where('purchase_requisition_id', $purchaseRequisition->id)
                ->whereNotIn('id', $keptItemIds)
                ->delete();

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $generalFile) {
                    if ($generalFile && $generalFile->isValid()) {
                        $storedPath = $generalFile->store("attachments/{$prNumber}", 'public');
                        Attachment::create([
                            'purchase_requisition_id' => $purchaseRequisition->id,
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

            // Update or create Contract Requisition
            $crData = $request->input('contract_requisition');
            if (!empty($crData) && (!empty($crData['cr_no']) || !empty($crData['contract_title']) || !empty($crData['scope_of_work']))) {
                $cr = $purchaseRequisition->contractRequisition ?? $purchaseRequisition->contractRequisitionLocal;
                $crFields = [
                    'cr_no' => !empty($crData['cr_no']) ? $crData['cr_no'] : ($cr?->cr_no ?? ('CR-' . date('Y') . '-' . str_pad($purchaseRequisition->id, 5, '0', STR_PAD_LEFT))),
                    'pr_number_sap' => $purchaseRequisition->sap_pr_number,
                    'purchase_requisition_id' => $purchaseRequisition->id,
                    'contract_title' => $crData['contract_title'] ?? null,
                    'scope_of_work' => $crData['scope_of_work'] ?? null,
                    'payment_terms' => $crData['payment_terms'] ?? null,
                    'bidders_qualification_criteria' => $crData['bidders_qualification_criteria'] ?? null,
                    'special_terms_condition' => $crData['special_terms_condition'] ?? null,
                    'guarantee_warranty_period' => $crData['guarantee_warranty_period'] ?? null,
                    'defect_liability_period' => $crData['defect_liability_period'] ?? null,
                    'others' => $crData['others'] ?? null,
                    'requisitioner_name' => !empty($crData['requisitioner_name']) ? $crData['requisitioner_name'] : ($purchaseRequisition->requisitioner ?: ($request->user()?->name ?? 'Requester')),
                    'req_designation' => !empty($crData['req_designation']) ? $crData['req_designation'] : ($request->user()?->designation ?? null),
                    'req_department' => !empty($crData['req_department']) ? $crData['req_department'] : ($request->user()?->department?->name ?? null),
                    'tender_type' => $crData['tender_type'] ?? 'Single',
                    'tender_estimate_value' => $crData['tender_estimate_value'] ?? 'Excluding GST',
                    'total_pr_value' => !empty($crData['total_pr_value']) ? $crData['total_pr_value'] : $totalAmount,
                    'total_pr_value_in_word' => $crData['total_pr_value_in_word'] ?? null,
                    'custom_field_1' => $crData['custom_field_1'] ?? null,
                    'custom_field_2' => $crData['custom_field_2'] ?? null,
                    'custom_field_3' => $crData['custom_field_3'] ?? null,
                    'custom_field_4' => $crData['custom_field_4'] ?? null,
                    'custom_field_5' => $crData['custom_field_5'] ?? null,
                    'custom_field_6' => $crData['custom_field_6'] ?? null,
                    'custom_field_7' => $crData['custom_field_7'] ?? null,
                    'custom_field_8' => $crData['custom_field_8'] ?? null,
                ];

                if ($cr) {
                    $cr->update($crFields);
                } else {
                    $cr = ContractRequisition::create($crFields);
                }
            }

            $purchaseRequisition->load(['items', 'attachments']);
            $purchaseRequisition->update([
                'sap_payload' => $purchaseRequisition->toSapODataV4Payload(),
            ]);
        });

        if ($purchaseRequisition->is_draft) {
            if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'success' => true,
                    'pr_id' => $purchaseRequisition->id,
                    'pr_number' => $prNumber,
                    'sap_pr_number' => null,
                    'is_draft' => true,
                    'sap_sync_status' => 'draft',
                    'total_amount' => $totalAmount,
                    'currency' => $purchaseRequisition->currency,
                    'message' => "Purchase Requisition {$prNumber} draft updated successfully in local database.",
                ]);
            }

            return redirect()->route('dashboard')->with(
                'success',
                "Purchase Requisition {$prNumber} draft updated successfully in local database."
            );
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

            foreach ($purchaseRequisition->attachments as $att) {
                $this->sapService->uploadAttachmentToSap($att, $sapPrNum, $att->item_number);
            }

            // Also dispatch Contract Requisition to SAP CBO YY1_API_CONTRACTREQUISITION
            $cr = $purchaseRequisition->contractRequisition ?? $purchaseRequisition->contractRequisitionLocal;
            if ($cr) {
                $cr->update(['pr_number_sap' => $sapPrNum]);
                $crSyncResult = $this->sapService->postContractRequisition($cr, $sapPrNum);
                $cr->update([
                    'sap_sync_status' => $crSyncResult['success'] ? 'synced' : 'failed',
                    'sap_synced_at' => $crSyncResult['success'] ? now() : null,
                    'sap_sync_message' => $crSyncResult['message'],
                    'sap_payload' => $crSyncResult['payload'],
                    'sap_response' => $crSyncResult['response'],
                ]);
            }

            if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'success' => true,
                    'pr_id' => $purchaseRequisition->id,
                    'pr_number' => $prNumber,
                    'sap_pr_number' => $sapPrNum,
                    'is_draft' => false,
                    'sap_sync_status' => 'synced',
                    'total_amount' => $totalAmount,
                    'currency' => $purchaseRequisition->currency,
                    'message' => "Purchase Requisition {$prNumber} successfully updated and synced to SAP S/4HANA Cloud (SAP PR #{$sapPrNum})!",
                ]);
            }

            return redirect()->route('dashboard')->with(
                'success',
                "Purchase Requisition {$prNumber} successfully updated and synced to SAP S/4HANA Cloud (SAP PR #{$sapPrNum})!"
            );
        } else {
            $purchaseRequisition->update([
                'sap_sync_status' => 'failed',
                'sap_sync_message' => $syncResult['message'] ?? 'Failed to sync with SAP',
                'sap_payload' => $syncResult['payload'] ?? $purchaseRequisition->sap_payload,
                'sap_response' => $syncResult['response'] ?? null,
            ]);

            if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
                return response()->json([
                    'success' => true,
                    'pr_id' => $purchaseRequisition->id,
                    'pr_number' => $prNumber,
                    'sap_pr_number' => null,
                    'is_draft' => false,
                    'sap_sync_status' => 'failed',
                    'total_amount' => $totalAmount,
                    'currency' => $purchaseRequisition->currency,
                    'warning' => "Purchase Requisition {$prNumber} updated in local database, but SAP S/4HANA Cloud sync failed: {$syncResult['message']}.",
                    'message' => "Purchase Requisition {$prNumber} updated in local database, but SAP S/4HANA Cloud sync failed: {$syncResult['message']}.",
                ]);
            }

            return redirect()->route('dashboard')->with(
                'warning',
                "Purchase Requisition {$prNumber} updated in local database, but SAP S/4HANA Cloud sync failed: {$syncResult['message']}. You can re-sync it from the dashboard."
            );
        }
    }

    /**
     * Delete an attachment from a draft PR.
     */
    public function deleteAttachment(Attachment $attachment): RedirectResponse
    {
        $pr = $attachment->purchaseRequisition;
        if ($pr && !$pr->is_draft) {
            return back()->with('error', 'Attachments can only be deleted from draft Purchase Requisitions.');
        }

        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }
        $attachment->delete();

        return back()->with('success', 'Attachment removed successfully.');
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
