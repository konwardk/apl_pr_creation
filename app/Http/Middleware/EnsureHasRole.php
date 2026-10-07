<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHasRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        if (! $user->is_active) {
            abort(403, 'Your account has been deactivated. Please contact the Super Administrator.');
        }

        // Superadmin bypasses role checks or check specified roles
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if (! empty($roles) && ! $user->hasRole($roles)) {
            abort(403, 'Access Denied: You do not have permission to access this module.');
        }

        return $next($request);
    }
}
