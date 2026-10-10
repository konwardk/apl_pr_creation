<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeptManagementController;
use App\Http\Controllers\HeaderOptionController;
use App\Http\Controllers\PrDocumentTypeController;
use App\Http\Controllers\PurchaseRequisitionController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check() ? redirect()->route('dashboard') : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified', 'role'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('purchase-requisitions/create', [PurchaseRequisitionController::class, 'create'])->name('purchase-requisitions.create');
    Route::post('purchase-requisitions', [PurchaseRequisitionController::class, 'store'])->name('purchase-requisitions.store');
    Route::post('purchase-requisitions/{purchaseRequisition}/sync', [PurchaseRequisitionController::class, 'sync'])->name('purchase-requisitions.sync');
    Route::post('purchase-requisitions/{purchaseRequisition}/finalize', [PurchaseRequisitionController::class, 'finalizeDraft'])->name('purchase-requisitions.finalize');
    Route::get('attachments/{attachment}/download', [PurchaseRequisitionController::class, 'downloadAttachment'])->name('attachments.download');
    Route::get('sap-materials', [PurchaseRequisitionController::class, 'getMaterials'])->name('sap-materials.index');
    Route::get('sap-account-assignment-categories', [PurchaseRequisitionController::class, 'getAccountAssignmentCategories'])->name('sap-account-assignment-categories.index');
    Route::get('sap-plants', [PurchaseRequisitionController::class, 'getPlants'])->name('sap-plants.index');

    // Super Administrator only: System Configuration (User Management & Department Management) & PR Configuration
    Route::middleware(['role:superadmin'])->group(function () {
        // System Configuration Landing Redirect
        Route::get('system-configuration', function () {
            return redirect()->route('users.index');
        })->name('system-configuration.index');

        // Manage Users
        Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('users', [UserManagementController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserManagementController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserManagementController::class, 'destroy'])->name('users.destroy');
        Route::post('users/{user}/toggle-status', [UserManagementController::class, 'toggleStatus'])->name('users.toggle-status');

        // Manage Departments
        Route::get('departments', [DeptManagementController::class, 'index'])->name('departments.index');
        Route::post('departments', [DeptManagementController::class, 'store'])->name('departments.store');
        Route::put('departments/{department}', [DeptManagementController::class, 'update'])->name('departments.update');
        Route::delete('departments/{department}', [DeptManagementController::class, 'destroy'])->name('departments.destroy');
        Route::post('departments/{department}/toggle-status', [DeptManagementController::class, 'toggleStatus'])->name('departments.toggle-status');

        // PR Configuration Hub
        Route::get('pr-configuration', function (\Illuminate\Http\Request $request) {
            $params = ['tab' => 'pr-configuration'];
            if ($request->filled('subtab')) {
                $params['subtab'] = $request->query('subtab');
            }
            return redirect()->route('dashboard', $params);
        })->name('pr-configuration.index');

        // Header Options Management
        Route::get('header-options', [HeaderOptionController::class, 'index'])->name('header-options.index');
        Route::post('header-options', [HeaderOptionController::class, 'store'])->name('header-options.store');
        Route::put('header-options/{headerOption}', [HeaderOptionController::class, 'update'])->name('header-options.update');
        Route::delete('header-options/{headerOption}', [HeaderOptionController::class, 'destroy'])->name('header-options.destroy');
        Route::post('header-options/{headerOption}/toggle-status', [HeaderOptionController::class, 'toggleStatus'])->name('header-options.toggle-status');

        // PR Document Types Management (SAP CDS View I_PurchaseRequisitionType)
        Route::get('pr-document-types', [PrDocumentTypeController::class, 'index'])->name('pr-document-types.index');
        Route::post('pr-document-types/fetch-sap', [PrDocumentTypeController::class, 'fetchSap'])->name('pr-document-types.fetch-sap');
        Route::post('pr-document-types/save-sap', [PrDocumentTypeController::class, 'saveSap'])->name('pr-document-types.save-sap');
        Route::put('pr-document-types/{prDocumentType}', [PrDocumentTypeController::class, 'update'])->name('pr-document-types.update');
        Route::delete('pr-document-types/{prDocumentType}', [PrDocumentTypeController::class, 'destroy'])->name('pr-document-types.destroy');
        Route::post('pr-document-types/{prDocumentType}/toggle-status', [PrDocumentTypeController::class, 'toggleStatus'])->name('pr-document-types.toggle-status');
    });
});

require __DIR__.'/settings.php';
