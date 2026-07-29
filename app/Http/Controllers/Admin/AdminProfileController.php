<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;

class AdminProfileController extends Controller
{
    public function edit(User $user)
    {
        return Inertia::render('Admin/Profile/Index', [
            'user' => $user
        ]);
    }
}
