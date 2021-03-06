<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use App\Goods;

class Category extends Model
{
    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'categories';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name'
    ];

    /**
     * Defining relationship with Goods
     */
    public function goods()
    {
        return $this->hasMany('\App\Goods','category_id');
    }

}