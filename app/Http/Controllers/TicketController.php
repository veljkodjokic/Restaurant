<?php

namespace App\Http\Controllers;

use App\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Invoice;
use App\Portion;

class TicketController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Create new Invoice instance
     */
    public function openNew(Request $request)
    {
        $input = $request->all();
        $user=Auth::user();
        if(!$user->hasOpenInvoice() && $input["m"]=="new"){
            $user->openInvoice();
        }
        else
            header("Refresh:0");
    }

    /**
     * Save Invoice instance
     */
    public function saveTicket(Request $request)
    {
        $input = $request->all();
        $id=$input["id"];
        $invoice=Invoice::find($id);
        $invoice->status=1;
        $invoice->save();
    }

    /**
     * Add Portion instance to Ticket
     */
    public function addPortion(Request $request)
    {
        $input = $request->all();
        $id=$input["id"];
        $invoice=Auth::user()->invoices()->where("status",0)->first();

        if($invoice->tickets()->where("portion_id",$id)->count() > 0){
            $ticket=$invoice->tickets()->where("portion_id",$id)->first();
            $ticket->quantity+=1;
            $ticket->save();
        }
        else {
            $ticket = new Ticket();
            $ticket->portion_id = $id;

            $ticket->invoice_id = $invoice->id;
            $ticket->quantity += 1;
            $ticket->save();
        }
    }

    /**
     * delete ticket
     */
    public function deleteTicket(Request $request)
    {
        $id=$request["id"];
        $ticket=Ticket::find($id);

        if ($ticket->quantity > 1){
            $ticket->quantity--;
            $ticket->save();
            return \Redirect::back();
        }
        else
            $ticket->delete();

        return \Redirect::back();
    }

    /**
     * delete invoice
     */
    public function deleteInvoice(Request $request)
    {
        $id=$request["id"];
        $invoice=Invoice::find($id);
        $invoice->delete();

        return \Redirect::back();
    }
}
