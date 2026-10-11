<?php

namespace App\Http\Controllers;

use App\Models\ItemCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ItemCategoryController extends Controller
{
    /**
     * Display a listing of the item categories.
     */
    public function index(Request $request): JsonResponse
    {
        $categories = ItemCategory::with('creator:id,name,email')
            ->orderBy('is_active', 'desc')
            ->orderBy('code')
            ->get();

        return response()->json([
            'itemCategories' => $categories,
        ]);
    }

    /**
     * Store a newly created item category.
     */
    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:item_categories,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $itemCategory = ItemCategory::create([
            'code' => trim($validated['code']),
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $request->has('is_active') ? (bool) $request->input('is_active') : true,
            'created_by' => $request->user()?->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Item category '{$itemCategory->name}' created successfully.",
                'itemCategory' => $itemCategory,
            ], 201);
        }

        return redirect()->back()->with('success', "Item category '{$itemCategory->name}' created successfully.");
    }

    /**
     * Update the specified item category.
     */
    public function update(Request $request, ItemCategory $itemCategory): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('item_categories', 'code')->ignore($itemCategory->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $itemCategory->update([
            'code' => trim($validated['code']),
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $request->has('is_active') ? (bool) $request->input('is_active') : $itemCategory->is_active,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Item category '{$itemCategory->name}' updated successfully.",
                'itemCategory' => $itemCategory,
            ]);
        }

        return redirect()->back()->with('success', "Item category '{$itemCategory->name}' updated successfully.");
    }

    /**
     * Remove the specified item category.
     */
    public function destroy(Request $request, ItemCategory $itemCategory): RedirectResponse|JsonResponse
    {
        $name = $itemCategory->name;
        $itemCategory->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Item category '{$name}' deleted successfully.",
            ]);
        }

        return redirect()->back()->with('success', "Item category '{$name}' deleted successfully.");
    }

    /**
     * Toggle active/inactive status.
     */
    public function toggleStatus(Request $request, ItemCategory $itemCategory): RedirectResponse|JsonResponse
    {
        $itemCategory->update([
            'is_active' => ! $itemCategory->is_active,
        ]);

        $statusText = $itemCategory->is_active ? 'activated' : 'deactivated';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Item category '{$itemCategory->name}' has been {$statusText}.",
                'itemCategory' => $itemCategory,
            ]);
        }

        return redirect()->back()->with('success', "Item category '{$itemCategory->name}' has been {$statusText}.");
    }
}
