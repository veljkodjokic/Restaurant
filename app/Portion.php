<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Portion extends Model
{
    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'portions';

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
        'portion', 'price', 'goods_id'
    ];

    /**
     * Defining relationship with Goods
     */
    public function good()
    {
        return $this->belongsTo('\App\Goods','goods_id');
    }

    /**
     * Defining relationship with Ticket
     */
    public function tickets()
    {
        return $this->hasMany('\App\Ticket');
    }
}
