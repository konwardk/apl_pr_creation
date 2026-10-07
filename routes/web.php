<?php

use App\Http\Controllers\DashboardController;
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

    // Super Administrator only: User Management
    Route::middleware(['role:superadmin'])->group(function () {
        Route::get('users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('users', [UserManagementController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserManagementController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserManagementController::class, 'destroy'])->name('users.destroy');
        Route::post('users/{user}/toggle-status', [UserManagementController::class, 'toggleStatus'])->name('users.toggle-status');
    });
});

require __DIR__.'/settings.php';
