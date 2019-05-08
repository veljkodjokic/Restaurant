<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'invoices';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id', 'amount'
    ];

    /**
     * Defining relationship with User
     */
    public function user()
    {
        return $this->belongsTo('\App\User');
    }

    /**
     * Defining relationship with Ticket
     */
    public function tickets()
    {
        return $this->hasMany('\App\Ticket');
    }

    /**
     * Returning Total
     */
    public function showTotal()
    {
        $total=0.00;
        $tickets=$this->tickets()->get();
        foreach ($tickets as $ticket){
            $portion=$ticket->portion()->first();
            $total+=$portion->price*$ticket->quantity;
        }
        $this->amount=$total;
        $this->save();
        return $total;
    }

}
