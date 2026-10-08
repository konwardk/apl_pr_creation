<?php

namespace App\Http\Controllers;

use App\Models\HeaderOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class HeaderOptionController extends Controller
{
    /**
     * Display a listing of the header options.
     */
    public function index(Request $request): JsonResponse
    {
        $options = HeaderOption::with('creator:id,name,email')
            ->orderBy('is_active', 'desc')
            ->orderBy('name')
            ->get();

        return response()->json([
            'headerOptions' => $options,
        ]);
    }

    /**
     * Store a newly created header option.
     */
    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:header_options,code'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        // Auto-generate code if left blank
        if (empty($validated['code'])) {
            $baseCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $validated['name']), 0, 8));
            if (empty($baseCode)) {
                $baseCode = 'HO';
            }
            $generatedCode = 'HO-' . $baseCode;
            $counter = 1;
            while (HeaderOption::where('code', $generatedCode)->exists()) {
                $generatedCode = 'HO-' . $baseCode . '-' . $counter;
                $counter++;
            }
            $validated['code'] = $generatedCode;
        } else {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $headerOption = HeaderOption::create([
            'name' => trim($validated['name']),
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'is_active' => $request->has('is_active') ? (bool) $request->input('is_active') : true,
            'created_by' => $request->user()?->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Header option "' . $headerOption->name . '" created successfully.',
                'headerOption' => $headerOption,
            ], 201);
        }

        return redirect()->back()->with('success', 'Header Option "' . $headerOption->name . '" created successfully.');
    }

    /**
     * Update the specified header option.
     */
    public function update(Request $request, HeaderOption $headerOption): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('header_options', 'code')->ignore($headerOption->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $headerOption->update([
            'name' => trim($validated['name']),
            'code' => strtoupper(trim($validated['code'])),
            'description' => $validated['description'] ?? null,
            'is_active' => $request->has('is_active') ? (bool) $request->input('is_active') : $headerOption->is_active,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Header option "' . $headerOption->name . '" updated successfully.',
                'headerOption' => $headerOption,
            ]);
        }

        return redirect()->back()->with('success', 'Header Option "' . $headerOption->name . '" updated successfully.');
    }

    /**
     * Remove the specified header option.
     */
    public function destroy(Request $request, HeaderOption $headerOption): RedirectResponse|JsonResponse
    {
        $name = $headerOption->name;
        $headerOption->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Header option "' . $name . '" deleted successfully.',
            ]);
        }

        return redirect()->back()->with('success', 'Header Option "' . $name . '" deleted successfully.');
    }

    /**
     * Toggle active/inactive status.
     */
    public function toggleStatus(Request $request, HeaderOption $headerOption): RedirectResponse|JsonResponse
    {
        $headerOption->update([
            'is_active' => !$headerOption->is_active,
        ]);

        $statusText = $headerOption->is_active ? 'activated' : 'deactivated';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Header option '{$headerOption->name}' has been {$statusText}.",
                'headerOption' => $headerOption,
            ]);
        }

        return redirect()->back()->with('success', "Header option '{$headerOption->name}' has been {$statusText}.");
    }
}
