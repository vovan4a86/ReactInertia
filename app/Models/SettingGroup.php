<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SettingGroup extends Model
{
    protected $fillable = ['name', 'description', 'page_id', 'order'];

    public function settings()
    {
        return $this->hasMany(Setting::class, 'setting_group_id');
    }
}
