<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'tickets';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'portion_id', 'invoice_id', 'quantity'
    ];

    /**
     * Defining relationship with Invoice
     */
    public function invoice()
    {
        return $this->belongsTo('\App\Invoice');
    }

    /**
     * Defining relationship with Portion
     */
    public function portion()
    {
        return $this->belongsTo('\App\Portion','portion_id');
    }
}
