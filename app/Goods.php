<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Goods extends Model
{
    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'goods';

    /**
     * The Primary key used by the model.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name', 'price', 'category_id'
    ];

    /**
     * Defining relationship with Category
     */
    public function category()
    {
        return $this->belongsTo('\App\Category');
    }

    /**
     * Defining relationship with Portion
     */
    public function portions()
    {
        return $this->hasMany('\App\Portion');
    }

}
