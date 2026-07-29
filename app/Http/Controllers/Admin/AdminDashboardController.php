<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminDashboardController
{
    public function index()
    {
        $user = Auth::user();

        return Inertia::render('Admin/Dashboard/Index', [
            'user' => $user,
            'stats' => User::all()->count(),
        ]);
    }
}
