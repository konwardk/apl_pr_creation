<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PurchaseRequisitionController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check() ? redirect()->route('dashboard') : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('purchase-requisitions', [PurchaseRequisitionController::class, 'store'])->name('purchase-requisitions.store');
    Route::post('purchase-requisitions/{purchaseRequisition}/sync', [PurchaseRequisitionController::class, 'sync'])->name('purchase-requisitions.sync');
});

require __DIR__.'/settings.php';
