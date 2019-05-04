<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Good extends Model
{
    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'goods';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name', 'price', 'category_id'
    ];
}
