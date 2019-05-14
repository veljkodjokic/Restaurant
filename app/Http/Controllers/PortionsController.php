<?php

namespace App\Http\Controllers;

use App\Http\Requests\GoodsRequest;
use Illuminate\Http\Request;
use App\Goods;
use App\Portion;
use App\Http\Requests\PortionRequest;

class PortionsController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('admin');
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index($id)
    {
        $good=Goods::find($id);
        $portions=$good->portions()->orderBy("price","ASC")->get();

        return view('portions.index', ['portions' => $portions,'good' => $good]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create($id)
    {
        $good=Goods::find($id);
        return view('portions.create', ['good' => $good]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(PortionRequest $request, Portion $model)
    {
        $model->create($request->all());
        return redirect('portions/show/'.$request['goods_id'])->withStatus(__('Portion successfully created.'));
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \App\Goods  $goods
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        $portion=Portion::find($id);
        return view('portions.edit', compact('portion'));
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Goods  $goods
     * @return \Illuminate\Http\Response
     */
    public function update(PortionRequest $request)
    {
        $model=Portion::find($request["goods_id"]);
        $model->update($request->all());

        return redirect('portions/show/'.$request['goods_id'])->withStatus(__('Portion successfully updated.'));
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Goods  $goods
     * @return \Illuminate\Http\Response
     */
    public function delete(Request $request)
    {
        $portion=Portion::find($request["id"]);
        $good_id=$portion->goods_id;
        $portion->delete();

        return redirect('portions/show/'.$good_id)->withStatus(__('Portion successfully deleted.'));
    }

}
