<?php

namespace App;

use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class User extends Authenticatable
{
    use Notifiable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name','email', 'password', 'birthday', 'field', 'address', 'contact', 'admin'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password', 'admin'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    /**
     * Defining relationship with Invoice
     */
    public function invoices()
    {
        return $this->hasMany('\App\Invoice');
    }

    /**
     * Checking if authenticated user has admin rights
     * @return bool
     */
    public function isAdmin()
    {
        if(Auth::user()->admin)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    /**
     * Checking if user has open invoice
     * @return bool
     */
    public function hasOpenInvoice()
    {

        $invoices=Auth::user()->invoices()->where("status",0)->get()->count();
        if($invoices)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    /**
     * Creating new Invoice instance
     */
    public function openInvoice()
    {
        $user=Auth::user();
        $invoice= new Invoice();
        $invoice->user_id=$user->id;
        $invoice->amount=0;
        $invoice->save();
    }

    /**
     * Query scope to get this months invoices
     */
    public function myMonthInv()
    {
        return $this->invoices()
            ->where('status', 1)
            ->whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->count();
    }

    /**
     * Query scope to get this months total
     */
    public function myMonthTotal()
    {
        $invoices= $this->invoices()
            ->where('status', 1)
            ->whereYear('created_at', Carbon::now()->year)
            ->whereMonth('created_at', Carbon::now()->month)
            ->get();
        $total=0;
        foreach ($invoices as $invoice)
            $total+=$invoice->showTotal();

        return $total;
    }
}
